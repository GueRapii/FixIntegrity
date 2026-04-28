#!/bin/sh

# Bersihkan semua file konfigurasi PIF di root
rm -f /data/adb/pif.json
rm -f /data/adb/pif.prop
rm -f /data/adb/pif.prop.old
rm -f /data/adb/pif_script_only

# Bersihkan file hasil generate di Tricky Store (Keybox, target apps, & security patch)
rm -f /data/adb/tricky_store/keybox.xml
rm -f /data/adb/tricky_store/target.txt
rm -f /data/adb/tricky_store/security_patch.txt
rm -f /data/adb/tricky_store/pif_auto_security_patch

# Bersihkan sisa injeksi Zygisk dari cache Google Play Services dan Play Store
for pkg in com.google.android.gms com.android.vending; do
    for dir in "/data/user_de/0/$pkg" "/data/data/$pkg"; do
        [ -d "$dir" ] || continue
        for artifact in libinject.so classes.dex pif.prop; do
            [ -f "$dir/$artifact" ] && rm -f "$dir/$artifact"
        done
    done
done

# LeafOS "gmscompat: Dynamically spoof props for GMS"
if [ -f /data/system/gms_certified_props.json ]; then
	resetprop -p --delete persist.sys.spoof.gms
fi

resetprop -c || true