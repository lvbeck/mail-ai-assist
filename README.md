# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist helps you work with emails you select in Thunderbird: summarize or translate a message, suggest tags, rewrite selected text in a draft, and export email locally. It does not proactively scan your entire mailbox. Automatic summaries and tags run only for new inbox messages in accounts where you explicitly enable each feature.

## Features

- **Email summaries:** Open AI Summary for the selected message to extract its main points and action items. Choose the summary language independently of the interface and translation languages; the default follows the system language.
- **Email translation:** Select source and target languages, or detect the source language automatically. Use Google Cloud Translation, Microsoft Azure Translator or DeepL with your own API key; without a configured translation service, translation uses the selected AI model.
- **Tag suggestions and aliases:** Prefer existing Thunderbird tags instead of creating near-duplicates. Review and edit manual suggestions before confirming. In Settings, map names such as `Project Alpha` and `Project Beta` to the existing `Projects` tag. Alias matching ignores case and extra spaces and matches complete names.
- **Selected-text rewriting:** Select text in a compose or reply window, request a rewrite, review the preview, then explicitly replace the selection. The add-on never sends emails automatically.
- **Local email export:** TXT exports email content and can exclude quoted replies and forwards. EML preserves the complete original message, encoding, headers, formatting and attachments; quoted content cannot be excluded. Export itself does not call an AI model or consume tokens. Choose an export folder and target desktop application; the helper reveals the file for you to drag or attach manually. It does not attach or send the file automatically. Closing the dialog keeps exported files.
- **Persistent cache:** Matching summaries and translations are reused when reopened, including after restarting Thunderbird. Retry requests a fresh result and updates the cache. Settings lets you view cache usage, open its folder or clear it; managed export files can be cleared separately.
- **Ten interface languages:** English, German, French, Italian, Spanish, Portuguese, Simplified Chinese, Traditional Chinese, Japanese and Korean.

## Optional automation for new mail

Both automatic summaries and automatic tags are **off by default for every account**. Right-click an account in Thunderbird and use the AI Assistant menu to enable either feature independently. Only newly received inbox messages in enabled accounts are processed; historical messages are not scanned, and messages already marked as junk are skipped.

Automatic summaries are saved to the cache for later viewing. Automatic tags are applied directly, using existing tags and alias rules; unlike manual suggestions, they do not require confirmation for each message. Automation uses your selected provider, model and relevant output language, sends message content to that service, and consumes its quota. The automatic-summary limit defaults to 100 attempts per account per day and is configurable; failed or cancelled attempts also count. This limit applies to summaries, not automatic tags.

Summary, translation and tagging process the message subject and body, not attachment contents. AI results may contain errors and should be reviewed before relying on them.

## Providers and privacy

Choose ChatGPT authorization, Gemini API or Claude API. Translation supports Google Cloud Translation, Azure Translator and DeepL; when no translation service is selected/configured, it uses the selected AI model. Service failures do not silently switch providers. Eligibility and charges depend on the provider. Relevant email content is sent to the selected service through the Windows helper. Credentials use Windows DPAPI; cache and exports are readable local files. See [privacy policy](publication/PRIVACY.md).

## Install and export

Use the same Thunderbird XPI on Windows and macOS, with a separately installed helper for your operating system.

### Downloads · v0.12.26

- [Windows x64 · MSI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-x64.msi)
- [macOS Apple Silicon (arm64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-arm64-unsigned.pkg)
- [macOS Intel (x64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-x64-unsigned.pkg)
- [Thunderbird · XPI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26.xpi)

Download the helper matching your operating system and the Thunderbird XPI below. Install the helper, then install the XPI from Thunderbird → Add-ons and Themes → Extensions → gear menu → Install Add-on From File. Restart Thunderbird.

The macOS 13+ PKGs are unsigned and not notarized. Full installation, sign-in and Thunderbird integration testing on real Macs is still pending. macOS automatic updates are not active.

Install the extension through ATN when published, or install the local XPI from Thunderbird’s add-on manager. The manifest minimum is Thunderbird 128; test the actual versions you deploy. TXT exports selected content with optional quote removal; EML preserves the raw message and attachments. Choose an export folder in Settings. Files are revealed for manual attachment and remain after closing; Settings can clear managed exports.

## Updates and migration

ATN manages extension updates; GitHub Releases hosts the helper MSI and signed helper-updates.json. Each release uses tag vVERSION and the latest release must include that manifest asset. GitHub downloads allow bounded HTTPS redirects only within this repository and to release-assets.githubusercontent.com; RSA signature, size and SHA-256 checks remain mandatory. Old helpers do not gain the new address or redirect support automatically: manually install the new MSI once. An existing self-hosted extension should be replaced with the same-ID ATN XPI; settings are retained subject to Thunderbird behavior. Future helper updates keep the existing user/machine-scope installation flow.

## Development

Source: extension/ (add-on), helper/ (native host), tests/, installer/, scripts/, publication/. dist/ contains artifacts and work/ temporary files; neither is committed. Use Node.js 22+ and Python 3.10+. No npm dependencies are required for tests or XPI packaging. Install npm dependencies only to regenerate icons (npm ci; npm run icons).

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI build

Windows x64, MSVC C++ Build Tools with Windows SDK, WiX 4.0.6 with UI/Util extensions, and a standalone Node runtime directory containing node.exe and NODE-LICENSE.txt are required. Run from the repository root. WIX_EXE and VCVARS64 optionally override tool discovery. Set the paths below to your own runtime and existing DPAPI signing key. Do not generate a replacement key for existing installations.

```powershell
dotnet tool install wix --version 4.0.6 --tool-path work/wix-tools
.\work\wix-tools\wix.exe extension add WixToolset.UI.wixext/4.0.6
.\work\wix-tools\wix.exe extension add WixToolset.Util.wixext/4.0.6
$env:MAIL_AI_RUNTIME_DIR = 'D:\build-tools\mail-ai-runtime'
$env:MAIL_AI_SIGNING_KEY_FILE = 'D:\private\update-signing-key.dpapi'
python installer/build-release.py
python installer/finalize-release.py
node installer/verify-release.mjs
```

## Publishing

Upload the contents of dist/github-release/v0.12.26/ as release assets, not as a single ZIP. Submit the ATN XPI separately using “On this site”. Review [reviewer notes](publication/REVIEW-NOTES.md), [listing](publication/LISTING.md) and [release procedure](publication/GITHUB-RELEASE.md). The scripts never push, upload or install automatically. Keep keys, credentials, mail and caches out of Git. .gitignore does not remove already committed secrets. MIT: see [LICENSE](LICENSE).

## macOS support · 0.12.26

Mac packages include Mail-AI-Assist.xpi next to setup-guide.html in /Library/Application Support/MailAiAssist. After installation, the guide opens for the logged-in desktop user when possible. If it does not open, open this folder in Finder. Install the XPI manually in Thunderbird and confirm its permissions.

The macOS 13+ PKGs are unsigned and not notarized. Full installation, sign-in and Thunderbird integration testing on real Macs is still pending. macOS automatic updates are not active.

[macOS build and test instructions](installer/macos/README.md)
