# Keybox Revive 📦📦

A simple Magisk / KernelSU / APatch module to easily install, restore, and update your `keybox.xml` for Tricky Store.

## ✨ Features

- **One-Click Update**: Update your keybox directly from the Magisk/KernelSU app using the Action button.
- **Smart Versioning**: The script checks the remote version before downloading. It will only download the keybox if there is a newer version available, saving data and time.
- **Auto Security Patch**: Automatically configures Tricky Store's `security_patch.txt` with your device's actual security patch date every time it runs.
- **Auto Target Apps**: Automatically selects and adds all your installed apps (including Google Play Services) to Tricky Store's `target.txt` so you don't have to set them up manually.
- **Play Integrity Fix Integration**: Includes the powerful Play Integrity Fix (PIF) module to help pass the Device verdict in Play Integrity tests.
- **Interactive WebUI**: Comes with a built-in Material Web interface to easily manage spoofing configurations, fetch the latest `pif.prop` via GitHub/Autopif, and view current props.
- **Advanced Spoofing Options**: Full control over spoofing device fingerprints (`spoofBuild`), system properties (`spoofProps`), custom keystore providers, and ROM signatures.
- **Script-Only Mode**: Allows temporary disabling of Zygisk injection to DroidGuard and Play Store while keeping sensitive prop handling active.

## ⚙️ Prerequisites

- A rooted Android device (Magisk, KernelSU, or APatch).
- Tricky Store installed.
- Curl or Wget (Usually pre-installed on Android/Magisk environments).

## 🚀 Installation

1. Download the latest `KeyboxRevive.zip` from the Releases page.
2. Open the Magisk / KernelSU / APatch app.
3. Go to the **Modules** tab.
4. Select **Install from storage** and choose the downloaded zip file.
5. Reboot your device.

## 💡 How to Use

1. Open the Magisk / KernelSU app and go to the Modules section.
2. Find **Keybox Revive** and tap the **Action** button (the terminal/play icon).
3. The script will automatically check for updates.
4. If a new version is found, it will automatically download and apply the new `keybox.xml` to `/data/adb/tricky_store/`.
5. If your current keybox is still valid and up-to-date, it will notify you without downloading anything.

## 🛡️ Play Integrity Fix (Included)

This module tries to fix Play Integrity verdicts to get a valid attestation.

### NOTE

This module is not made to hide root, nor to avoid detections in other apps. It only serves to pass Device verdict in the Play Integrity tests and certify your device.

### Tutorial

You will need root and Zygisk. Enable Magisk's built-in Zygisk or use [ZygiskNext](https://github.com/Dr-TSNG/ZygiskNext) / [ReZygisk](https://github.com/PerformanC/ReZygisk).

### Options

- **spoofBuild**: spoof fingerprint field, enabled by default.
- **spoofProvider**: custom keystore provider, enable when not using [TrickyStore](https://github.com/5ec1cff/TrickyStore).
- **spoofProps**: spoof prop when gms read from system prop, enable when not using [TrickyStore](https://github.com/5ec1cff/TrickyStore).
- **spoofSignature**: spoof rom signature, enable when your rom is signed by testkey. You can check your rom signature by running this command in terminal.
  ```sh
  unzip -l /system/etc/security/otacerts.zip | grep -oE "testkey|releasekey"
  ```
- **spoofVendingSdk**: spoof sdk version to 32 to Play Store if your device runs Android 13 or higher, this option will not take effect if your device is running Android 12 or lower.
  - Known issue: 
    - Back gesture/nav button from within the Play Store exits directly to homescreen for all
    - Blank account sign-in status and broken app updates for ROMs A14+
    - Incorrect app variants may be served for all
    - Full Play Store crashes for some setups
  - pixel_beta fingerprint can no longer get device verdict even on legacy check, so enabling this option won't help you to get device verdict anymore.

### Variety

- **inject-vending**: Based on the official inject branch, with the added spoofVendingSdk option.
- **inject-manual**: Based on inject-vending, with auto config (detect TrickyStore and ROM signature) removed.
- **inject-s**: Based on inject-manual, lightweight since it dropped the JSON format (pif.json -> pif.prop).

> [!NOTE]
> **inject-vending** and **inject-manual** branches are discontinued, but the branches will not be removed.

> [!WARNING]
> Do not use third-party tools to fetch fingerprints to avoid conflicts.
> The WebUI provides full control for configurable options.

#### About official PIF by chiteroman

- The official PIF by chiteroman has been removed from GitHub.
  - Official untouched main branch: https://github.com/KOWX712/PlayIntegrityFix/tree/main
  - Official untouched inject branch: https://github.com/KOWX712/PlayIntegrityFix/tree/inject
  - All tags from the official PIF repo are also preserved in this repo.

### Acknowledgments

- [kdrag0n](https://github.com/kdrag0n/safetynet-fix) & [Displax](https://github.com/Displax/safetynet-fix) for the original idea.
- This project is forked from the official chiteroman's PIF repo.
- [osm0sis](https://github.com/osm0sis) for his original [autopif2.sh](https://github.com/osm0sis/PlayIntegrityFork/blob/main/module/autopif2.sh) script, and [backslashxx](https://github.com/backslashxx) & [KOWX712](https://github.com/KOWX712) for improving it ([action.sh](https://github.com/chiteroman/PlayIntegrityFix/blob/main/module/action.sh)).
- [KOWX712](https://github.com/KOWX712/PlayIntegrityFix?tab=GPL-3.0-1-ov-file) I appreciate you granting me permission to incorporate a portion of your code into this module.

##  Support & Community

Join our Telegram channel for updates or contact the developers directly:

[![Telegram Channel](https://img.shields.io/badge/Telegram-Channel-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/randommodules)
[![GueRapii](https://img.shields.io/badge/Chat-GueRapii-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/GueRapii)

## ⚠️ Disclaimer

This module is provided "as is" without warranty of any kind. Use at your own risk. The developer is not responsible for any bricked devices, data loss, or banned accounts.

---
