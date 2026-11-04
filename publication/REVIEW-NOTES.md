# ATN reviewer notes — Mail AI Assist 0.12.27

Mail AI Assist 0.12.27
Add-on ID: mail-ai-assist@lvbeck.github.com
Contact: it@live.cn
Repository: https://github.com/lvbeck/mail-ai-assist
Release: https://github.com/lvbeck/mail-ai-assist/releases/tag/v0.12.27
Version 0.12.27 includes a Windows MSI and the submitted XPI. The helper protocol is unchanged; macOS users can use the previously published 0.12.26 helper packages linked below. Do not replace the submitted XPI with the older copy bundled in those macOS installers.

## Package and source review

The submitted ATN XPI contains readable JavaScript, HTML, CSS, and localization files. Its executable code is not minified, obfuscated, bundled, or transpiled. The XPI packaging process copies the extension files and serializes the manifest.

The repository includes package-lock.json. The npm development dependency is used for icon generation; npm dependencies are not required to inspect the extension code or package the XPI.

If a separate source archive is requested, the updated review archive includes the lockfile, packaging scripts, helper sources, and review documentation. The XPI can also be reviewed directly.

## Native helper requirement

AI features require a separately installed native messaging helper. The native host ID is local.mail_ai_assist.

Windows x64:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.27/Mail-AI-Assist-0.12.27-x64.msi

macOS Apple Silicon, macOS 13 or later:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-arm64-unsigned.pkg

macOS Intel, macOS 13 or later:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-x64-unsigned.pkg

Windows 0.12.27 checksums:
https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.27/SHA256SUMS.txt

macOS 0.12.26 checksums:
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

The add-on does not proactively scan the entire mailbox. Whole-message summary, translation, and tagging requests process the selected message's subject and body, not attachment contents.

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

The previous validator flagged an innerHTML assignment in mail-content.js. This assignment has now been replaced with native safe Sanitizer APIs, with a minimum Thunderbird version of 148.0. See the native HTML sanitization section below for the actual filtering behavior and verification boundaries.

## Privacy policy

https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md

## Reproduce the XPI

Use Python 3.10+ on a clean checkout or the extracted review-source archive. No npm packages, native runtime or private signing key are required:

```sh
python scripts/build-xpi.py --channel atn
```

The script copies extension assets verbatim, sets the archived manifest version from publication/atn.json, and ensures update_url is absent. It does not mutate the source manifest. ZIP timestamps and permissions are fixed. Compare extracted file contents across Python/zlib versions; compressed bytes may vary between runtimes. The existing icon assets are inputs and need not be regenerated.

For optional icon regeneration, run npm ci followed by npm run icons with Node.js 22 or later. The lockfile was generated using Node.js 22.22.0 and npm 10.9.4. Private keys, credentials, Node executables, node_modules, build outputs, and test fixtures are excluded from the review archive.

## Changes addressing the previous review

- Generated installer/download-page.html and installer/setup-guide.html are excluded from the supplemental source archive. The supplemental archive is intended to reproduce the XPI and inspect helper source, not to build native installers. For full native-installer builds use the repository checkout, which includes installer-page inputs. These pages are not part of the XPI.
- Removed unused button-close.svg, icon-dark.svg and icon-light.svg from extension sources and both XPI channels.
- All ten listing languages disclose nativeMessaging, the information exchanged, why the helper is needed, supported Windows/macOS platforms, unsigned macOS package limitations and the lack of Linux support.
- Migrated all tag listing/creation calls to messages.tags.list() and messages.tags.create(), available since Thunderbird 121 and compatible with the declared minimum of 148.

## Message body menu and selected text

Right-click the message body, links or images. With no text selected, the menu offers the existing whole-message actions. With a selection, only summary and translation content actions are offered. Only the selected text is sent: neither the subject nor the rest of the message is appended. Results use a separate selection cache scope. Missing selections never fall back to a whole-message request. No Experiment API or full-access permission is used. The standard messagesTagsList permission is now explicitly declared for the supported tag-listing API.

Test in the reading pane, a message tab and a separate message window, both with and without a selection, including links and images. Menus should not appear in compose windows or ordinary web tabs. Confirm that selection results do not reuse whole-message cache entries.

## Native messaging disclosure

The native host exchanges subject/body or selected text, provider/model/language settings, credentials entered for authentication, AI results, cache data and export content/paths. EML export includes original headers and attachments. It performs provider authentication and HTTPS requests, protected credential storage, local caching/export and desktop integration. Text goes to the configured provider; local export itself makes no AI request. No arbitrary model-generated commands are executed.

## Source archive guidance

The XPI is directly readable and does not require a source-code archive to understand its executable code. Prefer submitting the XPI alone unless the reviewer explicitly requests the supplemental archive. Providing a redundant archive triggers a separate build review. The archive includes package.json and package-lock.json; private keys and compiled helper/runtime binaries are excluded.

## Native HTML sanitization (Thunderbird 148+)

The minimum Thunderbird version is now 148.0. MailContent uses Element.setHTML() with an explicit removal configuration on an HTML root inside an inert template document, never attached to the live DOM. Document.parseHTML() uses the same native sanitizer to preserve outer HTML attributes that fragment parsing would otherwise discard; both safe APIs are available in Gecko 148. XSS-unsafe content is stripped by the native sanitizer. Resource elements are excluded before insertion. Visibility metadata (style, class, id, hidden and aria-hidden) is intentionally retained only for analysis. Matching hidden elements are removed with their entire subtrees before text extraction; style elements are then removed. Embedded stylesheets are parsed in a constructed sheet that is never adopted; external imports are not fetched. Existing quote selectors and prompt-injection defenses remain in place. This does not claim that visible email text cannot contain prompt injection or that an offline extractor reproduces every rendering-dependent CSS effect.

EML exports still use messages.getRaw() and stream the original bytes without HTML parsing or sanitization. Only HTML-to-text extraction is changed. No parse5 dependency or new extension permission is introduced.

Use the accompanying VALIDATION-0.12.27.md for the actual automated and browser-test results and remaining verification limits. A passing linter is not a substitute for manual ATN review.
