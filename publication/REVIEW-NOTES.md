# ATN reviewer notes — Mail AI Assist 0.12.26

Mail AI Assist 0.12.26
Add-on ID: mail-ai-assist@lvbeck.github.com
Contact: it@live.cn
Repository: https://github.com/lvbeck/mail-ai-assist
Release: https://github.com/lvbeck/mail-ai-assist/releases/tag/v0.12.26

## Package and source review

The submitted ATN XPI contains readable JavaScript, HTML, CSS, and localization files. Its executable code is not minified, obfuscated, bundled, or transpiled. The XPI packaging process copies the extension files and serializes the manifest.

The repository includes package-lock.json. The npm development dependency is used for icon generation; npm dependencies are not required to inspect the extension code or package the XPI.

If a separate source archive is requested, the updated review archive includes the lockfile, packaging scripts, helper sources, and review documentation. The XPI can also be reviewed directly.

## Native helper requirement

AI features require a separately installed native messaging helper. The native host ID is local.mail_ai_assist.

Windows x64:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-x64.msi

macOS Apple Silicon, macOS 13 or later:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-arm64-unsigned.pkg

macOS Intel, macOS 13 or later:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-x64-unsigned.pkg

Checksums:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/SHA256SUMS.txt

The macOS PKGs are unsigned and not notarized. Both architectures were built successfully, and package inspection verified the bundled XPI, setup guide, and post-install script. Full physical-Mac testing is still pending; successful compilation is not presented as proof of end-to-end functionality.

The macOS installer attempts to open the local setup guide as the logged-in desktop user. It does not automatically install the XPI into Thunderbird or approve extension permissions. If the submitted XPI is already installed, reviewers do not need to install the bundled copy again.

## Testing

1. Install the submitted XPI in Thunderbird.
2. Install the matching native helper and restart Thunderbird.
3. Open the add-on settings and configure your own supported provider account or API key.
4. Select a test message and request a summary, translation, or tag suggestions.
5. For rewriting, select text in a compose window, review the result, and explicitly confirm replacement.
6. Local email export can be tested without an AI request.

No shared test credentials are included. Provider access and charges depend on the reviewer's account.

## Data handling and automation

The add-on does not proactively scan the entire mailbox. Manual summary, translation, and tagging requests process the selected message's subject and body, not attachment contents.

Automatic summaries and automatic tags are disabled by default for every account. Users must explicitly enable them per account. These features process newly received inbox messages in enabled accounts.

Relevant content is sent through the local helper to the configured provider. Local email export itself does not call an AI model. EML export preserves the original message, including attachments.

Credentials are protected using Windows DPAPI or macOS Keychain-backed encryption. Cache and exported files remain local. AI output is not executed as code, and the add-on does not automatically send email.

## Updates

The ATN XPI has no custom update_url; Thunderbird/ATN manages extension updates.

The Windows helper retains its separate update mechanism, with signed update metadata and package size/hash verification. macOS automatic updates are not enabled for the currently published unsigned test packages.

## Validation warnings

The previous ATN validation reported warnings for these Thunderbird-specific permissions:
compose, messagesRead, messagesUpdate, messagesTags, and accountsRead.

These permissions support composition, reading selected messages, applying tags, managing tags, and account-specific settings. Please evaluate them against Thunderbird's MailExtension APIs.

The validator also flagged an innerHTML assignment in mail-content.js. This warning is disclosed for manual inspection of the HTML-to-text conversion path; it should not be treated as resolved merely because the package passed automated validation.

## Privacy policy

https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md

## Reproduce the XPI

Use Python 3.10+ on a clean checkout or the extracted review-source archive. No npm packages, native runtime or private signing key are required:

```sh
python scripts/build-xpi.py --channel atn
```

The script copies extension assets verbatim, sets the archived manifest version from publication/atn.json, and ensures update_url is absent. It does not mutate the source manifest. ZIP timestamps and permissions are fixed. Compare extracted file contents across Python/zlib versions; compressed bytes may vary between runtimes. The existing icon assets are inputs and need not be regenerated.

For optional icon regeneration, run npm ci followed by npm run icons with Node.js 22 or later. The lockfile was generated using Node.js 22.22.0 and npm 10.9.4. Private keys, credentials, Node executables, node_modules, build outputs, and test fixtures are excluded from the review archive.
