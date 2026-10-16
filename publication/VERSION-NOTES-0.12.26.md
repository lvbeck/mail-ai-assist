# Version notes — 0.12.26 (local build)

- Added macOS native-helper source support for Apple Silicon and Intel, including Keychain credential protection, folder selection and Finder export reveal.
- Added macOS helper download entries and platform-specific setup instructions in all ten interface languages.
- Preserved Windows MSI installation and updates; macOS uses separate signed PKG update feeds.
- Added package-lock.json to the optional review-source archive and clarified that the readable XPI does not require a transformed-code source build.

Release status: macOS PKGs have not yet been compiled, signed/notarized or validated on real Macs. The download entries currently open the GitHub release page. This local build has not been published or submitted to ATN.
