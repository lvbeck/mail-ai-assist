# macOS 0.12.29 package validation

Validated on 19 November 2026 in [GitHub Actions run 44538607401](https://github.com/lvbeck/mail-ai-assist/actions/runs/44538607401).

Build source: `f5d903ee7e26ca0a798f2c4a23dcc0343167b887`. The helper, Swift bridge and extension sources are unchanged from the published 0.12.29 release commit `4215c5ee53ce11dcc06b9ac001deb985b6240396`.

| Package | Native runner | Runtime | Native regression tests | SHA-256 |
| --- | --- | --- | --- | --- |
| Apple Silicon arm64 | macos-15 (arm64) | Node.js 22.22.0 darwin-arm64 | 32 passed; 0 failed or skipped | `a237642964ab69e390267375bb7f56c29ef300b1d824ae3e4c3f1ca7c804dfdc` |
| Intel x64 | macos-15-intel (x86_64) | Node.js 22.22.0 darwin-x64 | 32 passed; 0 failed or skipped | `02fc99df2341a04610272746408453feea165fdde3f1135cc84d0e9263bfd04d` |

Both jobs verified the official runtime archive checksum, compiled the Swift bridge natively, built and expanded the PKG, checked its version and native-host registration, compared every packaged helper module with source, verified CPU architectures and executable permissions, executed the bundled Node runtime, checked installer shell syntax and compared all 70 bundled XPI files with the extension source. The native regression suite covered platform behavior, credential locks, interrupted-owner recovery, export locking, cleanup, custom directories, retention, raw EML and provider routing.

Downloaded GitHub Actions artifacts were checked against artifact digests, PKG hashes and the source commit before release upload. Each PKG has a separate `SHA256SUMS-macos-ARCH.txt` asset. Existing Windows MSI, XPI and signed Windows update-manifest assets were retained unchanged.

These PKGs are unsigned and unnotarized. No signed Mac update feed is published. Full Thunderbird GUI and real-account flows, installation and upgrade acceptance, Gatekeeper/notarization behavior and testing on macOS 13 remain pending. Passing native CI tests does not establish those results.
