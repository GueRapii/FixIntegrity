#!/system/bin/sh

MODDIR=${0%/*}

# --- PLAY INTEGRITY FIX SECTION ---
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

# Wait until the device has completely finished booting (boot_completed)
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
# --- END OF PLAY INTEGRITY FIX SECTION ---

# Check if the auto update marker file exists (created via customize.sh)
# If it doesn't exist (user chose Vol Down), exit this script
if [ ! -f "$MODDIR/auto_update" ]; then
    exit 0
fi

# Infinite background loop every 12 hours
while true; do
    # Rest the script for 12 hours (43200 seconds)
    sleep 43200
    
    # Run action.sh script silently
    sh "$MODDIR/action.sh" > /dev/null 2>&1
done