#!/system/bin/sh

# Don't flash in recovery!
if ! $BOOTMODE; then
    ui_print "*********************************************************"
    ui_print "! Install from recovery is NOT supported"
    ui_print "! Recovery sucks"
    ui_print "! Please install from Magisk / KernelSU / APatch app"
    abort    "*********************************************************"
fi

# Error on < Android 8
if [ "$API" -lt 26 ]; then
    abort "! You can't use this module on Android < 8.0"
fi

check_zygisk() {
    local ZYGISK_MODULE="/data/adb/modules/zygisksu"
    local REZYGISK_MODULE="/data/adb/modules/rezygisk"
    local MAGISK_DIR="/data/adb/magisk"
    local ZYGISK_MSG="Zygisk is not enabled. Please either:
    - Enable Zygisk in Magisk settings
    - Install ZygiskNext or ReZygisk module"

    # Check if Zygisk module directory exists
    if [ -d "$ZYGISK_MODULE" ] || [ -d "$REZYGISK_MODULE" ]; then
        return 0
    fi

    # If Magisk is installed, check Zygisk settings
    if [ -d "$MAGISK_DIR" ]; then
        # Query Zygisk status from Magisk database
        local ZYGISK_STATUS
        ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';")

        # Check if Zygisk is disabled
        if [ "$ZYGISK_STATUS" = "value=0" ]; then
            abort "$ZYGISK_MSG"
        fi
    else
        abort "$ZYGISK_MSG"
    fi
}

# Module requires Zygisk to work
check_zygisk

ui_print "==================================="
ui_print "   FixIntegrity 📦📦 Auto-Update   "
ui_print "==================================="
ui_print "Do you want to enable Auto-Update?"
ui_print "It will check for updates every 12 hours."
ui_print " "
ui_print "  [ VOLUME UP ]   = YES, Enable"
ui_print "  [ VOLUME DOWN ] = NO, Disable"
ui_print " "

# Loop to capture volume button input
while true; do
    key=$(getevent -qlc 1 2>/dev/null | awk '{ print $3 }')
    if [ "$key" = "KEY_VOLUMEUP" ]; then
        ui_print " -> You selected: YES (Auto-Update Enabled)"
        # Create a marker file indicating the user agreed to auto-update
        touch "$MODPATH/auto_update"
        break
    elif [ "$key" = "KEY_VOLUMEDOWN" ]; then
        ui_print " -> You selected: NO (Auto-Update Disabled)"
        break
    fi
done

ui_print "==================================="
ui_print "[!] NOTE:"
ui_print "You can ALWAYS update manually at any"
ui_print "time by pressing the 'Action' button"
ui_print "in the Magisk/KernelSU app."
ui_print " "
if [ -f "$MODPATH/auto_update" ]; then
    ui_print "Since Auto-Update is ON, the script"
    ui_print "will automatically run in the background"
    ui_print "every 12 hours."
    ui_print " "
fi
ui_print "-> After rebooting, you can just click"
ui_print "   the Action button right away to get"
ui_print "   the newest keybox 📦📦 immediately!"
ui_print "==================================="

# safetynet-fix module is obsolete and it's incompatible with PIF
SNFix="/data/adb/modules/safetynet-fix"
if [ -d "$SNFix" ]; then
    ui_print "! safetynet-fix module is obsolete and it's incompatible with PIF, it will be removed on next reboot"
    ui_print "! Do not install it"
    touch "$SNFix"/remove
fi

# playcurl warn
if [ -d "/data/adb/modules/playcurl" ]; then
    ui_print "! playcurl may overwrite fingerprint with invalid one, be careful!"
fi

# MagiskHidePropsConf module is obsolete in Android 8+ but it shouldn't give issues
if [ -d "/data/adb/modules/MagiskHidePropsConf" ]; then
    ui_print "! WARNING, MagiskHidePropsConf module may cause issues with PIF."
fi

# Preserve previous setting (Path adjusted to FixIntegrity)
if [ -f "/data/adb/modules/fixintegrity/pif.prop" ]; then
    ui_print "- Restoring previous pif.prop settings..."
    cp -af "/data/adb/modules/fixintegrity/pif.prop" "$MODPATH/pif.prop"
else
    ui_print "- Fresh install: PIF is inactive until Action is pressed."
    mv "$MODPATH/pif.prop" "$MODPATH/pif.prop.config"
fi
if [ -f "/data/adb/modules/fixintegrity/system.prop" ]; then
    cp -af /data/adb/modules/fixintegrity/system.prop "$MODPATH/system.prop"
fi

# Check custom fingerprint
if [ -f "/data/adb/pif.prop" ]; then
    ui_print "- Backup custom pif.prop"
    mv -f /data/adb/pif.prop /data/adb/pif.prop.old
fi

# Grant execution permissions to all scripts
chmod +x "$MODPATH/autopif.sh"
chmod +x "$MODPATH/autopif_ota.sh"
chmod +x "$MODPATH/action.sh"
chmod +x "$MODPATH/security_patch.sh"

# Clean up remaining GMS cache
for pkg in com.google.android.gms com.android.vending; do
    for dir in "/data/user_de/0/$pkg" "/data/data/$pkg"; do
        [ -d "$dir" ] || continue
        for artifact in libinject.so classes.dex pif.prop; do
            [ -f "$dir/$artifact" ] && rm -f "$dir/$artifact"
        done
    done
done