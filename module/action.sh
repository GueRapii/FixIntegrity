#!/system/bin/sh

MODDIR=${0%/*}

LOGFILE="$MODDIR/action.log"

# Membungkus seluruh proses untuk membuat log file
{

GITHUB_URL="https://raw.githubusercontent.com/GueRapii/randommodulesfiles/refs/heads/main/file.enc"
VERSION_URL="https://raw.githubusercontent.com/GueRapii/randommodulesfiles/refs/heads/main/keyversion.txt"

TARGET_DIR="/data/adb/tricky_store"
TARGET_FILE="$TARGET_DIR/keybox.xml"
TMP_ENC_FILE="$TARGET_DIR/file.enc"
LOCAL_VERSION_FILE="$MODDIR/keyversion.txt"
SECURITY_PATCH_FILE="$TARGET_DIR/security_patch.txt"
TARGET_TXT_FILE="$TARGET_DIR/target.txt"
PIF_PROP="/data/adb/pif.prop"
PIF_JSON="/data/adb/pif.json"

echo "==================================="
echo "      FixIntegrity Action 📦📦     "
echo "==================================="

LOCAL_VERSION=0
if [ -f "$LOCAL_VERSION_FILE" ]; then
    LOCAL_VERSION=$(cat "$LOCAL_VERSION_FILE" | tr -d '\r\n')
fi

TIMESTAMP=$(date +%s)

echo "[*] Checking for updates..."
REMOTE_VERSION=$(curl -s "${VERSION_URL}?t=$TIMESTAMP" | tr -d '\r\n')
if [ -z "$REMOTE_VERSION" ]; then
    REMOTE_VERSION=$(wget -qO- "${VERSION_URL}?t=$TIMESTAMP" | tr -d '\r\n')
fi

if [ -z "$REMOTE_VERSION" ]; then
    echo "[-] Failed to check version! Ensure your internet is active and the URL is valid."
    exit 1
fi

echo "[*] Local version: $LOCAL_VERSION | Remote version: $REMOTE_VERSION"

if [ "$REMOTE_VERSION" -gt "$LOCAL_VERSION" ] 2>/dev/null; then
    echo "[*] New version found! Preparing to update..."
    echo "[*] Checking tricky_store folder..."
    mkdir -p "$TARGET_DIR"

    echo "[*] Downloading encrypted keybox from GitHub..."
    if curl -s -L -o "$TMP_ENC_FILE" "${GITHUB_URL}?t=$TIMESTAMP"; then
        echo "[+] Successfully downloaded using curl!"
    elif wget -q -O "$TMP_ENC_FILE" "${GITHUB_URL}?t=$TIMESTAMP"; then
        echo "[+] Successfully downloaded using wget!"
    else
        echo "[-] Download failed! Ensure your internet is active and the URL is valid."
        exit 1
    fi

    echo "[*] Decrypting keybox..."
    base64 -d "$TMP_ENC_FILE" > "$TARGET_FILE"
    
    if grep -q "<Keybox" "$TARGET_FILE"; then
        echo "[+] Decryption successful!"
        rm -f "$TMP_ENC_FILE"
    else
        echo "[-] Decryption failed! The file is not a valid Keybox."
        rm -f "$TMP_ENC_FILE"
        exit 1
    fi

    chmod 644 "$TARGET_FILE"
    echo "$REMOTE_VERSION" > "$LOCAL_VERSION_FILE"
    echo "[+] Done! Tricky Store Keybox has been successfully updated to version $REMOTE_VERSION."
else
    echo "[+] Keybox is already up to date."
    echo "[!] (If the keybox is invalid, please report to the Telegram channel to be updated)"
fi

echo "-----------------------------------"
echo "[*] Configuring Target Apps..."
mkdir -p "$TARGET_DIR"

> "$TARGET_TXT_FILE" # Mengosongkan file target.txt sebelumnya

# Ambil aplikasi pihak ketiga, lalu tambahkan layanan Google (GMS & Play Store) wajib!
{
    pm list packages -3 | cut -d':' -f2
    echo "com.google.android.gms"
    echo "com.google.android.gms.unstable"
    echo "com.android.vending"
} >> "$TARGET_TXT_FILE"

sort -u "$TARGET_TXT_FILE" > "${TARGET_TXT_FILE}.tmp"
mv "${TARGET_TXT_FILE}.tmp" "$TARGET_TXT_FILE"
chmod 644 "$TARGET_TXT_FILE"

echo "[+] All installed apps successfully added to target.txt!"

echo "-----------------------------------"
echo "[*] Generating dynamic pif.prop (Play Integrity Fix)..."

# Menjalankan script autopif.sh secara eksternal
sh "$MODDIR/autopif.sh"

# Mengambil data yang baru digenerate oleh autopif.sh untuk kebutuhan format JSON & Tricky Store
if [ -f "$PIF_PROP" ]; then
    MODEL=$(grep "^MODEL=" "$PIF_PROP" | cut -d= -f2)
    FINGERPRINT=$(grep "^FINGERPRINT=" "$PIF_PROP" | cut -d= -f2)
    SECURITY_PATCH=$(grep "^SECURITY_PATCH=" "$PIF_PROP" | cut -d= -f2)
else
    echo "[-] Failed to read generated pif.prop!"
    exit 1
fi

# Sinkronisasi kembali ke folder internal module
cp "$PIF_PROP" "$MODDIR/pif.prop"

# Format pif.json sebagai cadangan untuk versi PIF lain
cat <<EOF > "$PIF_JSON"
{
  "MANUFACTURER": "Google",
  "MODEL": "$MODEL",
  "FINGERPRINT": "$FINGERPRINT",
  "SECURITY_PATCH": "$SECURITY_PATCH"
}
EOF
chmod 644 "$PIF_JSON"

echo "[*] Configuring global & Tricky Store Security Patch..."
# Mengeksekusi script official security patch util untuk update ke Tricky Store & prop internal
sh "$MODDIR/security_patch.sh"

echo "[+] pif.prop successfully generated and applied instantly!"

} 2>&1 | tee "$LOGFILE"