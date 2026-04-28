#!/system/bin/sh

MODDIR=${0%/*}

# --- BAGIAN PLAY INTEGRITY FIX ---
. "$MODDIR"/common_func.sh

# Conditional sensitive properties
resetprop_if_match ro.boot.mode recovery unknown
resetprop_if_match ro.bootmode recovery unknown
resetprop_if_match vendor.boot.mode recovery unknown

resetprop_if_diff ro.boot.selinux enforcing
if [ "$(toybox cat /sys/fs/selinux/enforce)" = "0" ]; then
    chmod 640 /sys/fs/selinux/enforce
    chmod 440 /sys/fs/selinux/policy
fi

# Tunggu sampai HP benar-benar selesai menyala (boot_completed)
until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 1
done

resetprop_if_diff ro.secureboot.lockstate locked
resetprop_if_diff ro.boot.flash.locked 1
resetprop_if_diff ro.boot.realme.lockstate 1
resetprop_if_diff ro.boot.vbmeta.device_state locked
resetprop_if_diff vendor.boot.verifiedbootstate green
resetprop_if_diff ro.boot.verifiedbootstate green
resetprop_if_diff ro.boot.veritymode enforcing
resetprop_if_diff vendor.boot.vbmeta.device_state locked
resetprop_if_diff sys.oem_unlock_allowed 0
# --- AKHIR BAGIAN PLAY INTEGRITY FIX ---

# Cek apakah file penanda auto update ada (dibuat via customize.sh)
# Jika tidak ada (user pilih Vol Down), matikan script ini
if [ ! -f "$MODDIR/auto_update" ]; then
    exit 0
fi

# Loop abadi di background setiap 12 jam
while true; do
    # Istirahatkan script selama 12 jam (43200 detik)
    sleep 43200
    
    # Jalankan script action.sh secara diam-diam
    sh "$MODDIR/action.sh" > /dev/null 2>&1
done