# Mail AI Assist 0.12.29

- Recheck account, Inbox and junk eligibility before automatic tag requests, and stop pending tag mutations after the account opt-in is revoked.
- Deduplicate equivalent tag names using the existing Unicode normalization and case-insensitive matching rules.
- Replace PID credential lock recovery with process-owned Windows locks and inherited-descriptor macOS locks.
- Recover known local export ownership after helper termination, publish and withdraw complete ownership markers atomically, and protect active shared-directory exports during cleanup.
- Preserve pre-existing temporary files when TXT or EML initialization fails. Unknown legacy and foreign export markers remain untouched.

Requires Thunderbird 148 or later. Update both the Windows x64 MSI and XPI, then restart Thunderbird. No provider fallback or automatic email sending was added.

Windows and unsigned macOS packages are available for manual installation. Real Thunderbird/API integration, Windows installation and upgrade, elevated update handoff and directory ACLs, and multi-host network-filesystem behavior still require acceptance testing. The RSA-signed helper update manifest does not imply Windows Authenticode or ATN signing of the package files.

Validation: 297 regression tests passed with the bundled Node.js v24.19.0. All 35 MSI payload files match the current source/staging bytes; both 70-file XPI archives match the extension source. RSA update-manifest verification, dual-scope MSI costing, all ten in-memory installer language checks, and direct ATN XPI lint passed. The MSI remains Authenticode-unsigned; full installation and upgrade acceptance testing remains pending.

macOS package update: Apple Silicon and Intel 0.12.29 PKGs include the updated helper, Swift bridge, matching Node runtime, XPI and local setup guide. Packages remain unsigned and unnotarized and are not published to the signed Mac update feeds. Native build and package checks are distinct from full Thunderbird and real-account acceptance testing.

Both macOS architectures passed 32 native regression tests each with no failures or skips, plus PKG payload, runtime architecture and bundled-XPI checks. See [macOS package validation](VALIDATION-macos-0.12.29.md).
