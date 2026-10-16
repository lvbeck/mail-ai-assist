# Version notes — 0.12.26

- Added native helper support for macOS 13 and later, with separate installers for Apple Silicon (arm64) and Intel (x64).
- Added macOS Keychain-backed credential protection, Finder integration for exported files, and platform-specific setup instructions.
- macOS installers now include the Thunderbird XPI and attempt to open the setup guide for the logged-in desktop user after installation. Users must install the XPI manually in Thunderbird and approve its permissions.
- Updated all ten README translations and both setup guides with Windows, Apple Silicon, Intel, and XPI download links.
- Preserved the existing Windows x64 helper and update mechanism.

macOS installers are currently unsigned and not notarized. Full validation of installation, sign-in, and Thunderbird integration on physical Macs is still in progress. macOS automatic updates are not enabled.
