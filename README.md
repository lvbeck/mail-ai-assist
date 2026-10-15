# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist adds summaries, translation, tag suggestions, selected-text rewriting and local email export to Thunderbird. Version 0.12.24 prepares GitHub-hosted helper downloads and ATN extension updates.

## Features

Summaries have an independent output-language setting. Summaries and translations are cached persistently; Retry regenerates the result. Automatic summaries and tags are off by default and enabled per account for new inbox messages. The default automatic-summary limit is 100 attempts per account per day. Tag suggestions reuse existing tags and support alias rules. Rewriting previews the selected draft text before explicit replacement; messages are never sent automatically.

## Providers and privacy

Choose ChatGPT authorization, Gemini API or Claude API. Translation supports Google Cloud Translation, Azure Translator and DeepL; when no translation service is selected/configured, it uses the selected AI model. Service failures do not silently switch providers. Eligibility and charges depend on the provider. Relevant email content is sent to the selected service through the Windows helper. Credentials use Windows DPAPI; cache and exports are readable local files. See [privacy policy](publication/PRIVACY.md).

## Install and export

Windows x64 helper required. Download the MSI from [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), install it and restart Thunderbird. Install the extension through ATN when published, or install the local XPI from Thunderbird’s add-on manager. The manifest minimum is Thunderbird 128; test the actual versions you deploy. No ATN listing or GitHub release is implied by these links. TXT exports selected content with optional quote removal; EML preserves the raw message and attachments. Choose an export folder in Settings. Files are revealed for manual attachment and remain after closing; Settings can clear managed exports.

## Updates and migration

ATN manages extension updates; GitHub Releases hosts the helper MSI and signed helper-updates.json. Each release uses tag vVERSION and the latest release must include that manifest asset. GitHub downloads allow bounded HTTPS redirects only within this repository and to release-assets.githubusercontent.com; RSA signature, size and SHA-256 checks remain mandatory. Old helpers do not gain the new address or redirect support automatically: manually install the new MSI once. An existing self-hosted extension should be replaced with the same-ID ATN XPI; settings are retained subject to Thunderbird behavior. Future helper updates keep the existing user/machine-scope installation flow.

## Development

Source: extension/ (add-on), helper/ (native host), tests/, installer/, scripts/, publication/. dist/ contains artifacts and work/ temporary files; neither is committed. Use Node.js 22+ and Python 3.10+. No npm dependencies are required for tests or XPI packaging. Install npm dependencies only to regenerate icons (npm install; npm run icons).

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

Upload the contents of dist/github-release/v0.12.24/ as release assets, not as a single ZIP. Submit the ATN XPI separately using “On this site”. Review [reviewer notes](publication/REVIEW-NOTES.md), [listing](publication/LISTING.md) and [release procedure](publication/GITHUB-RELEASE.md). The scripts never push, upload or install automatically. Keep keys, credentials, mail and caches out of Git. .gitignore does not remove already committed secrets. MIT: see [LICENSE](LICENSE).
