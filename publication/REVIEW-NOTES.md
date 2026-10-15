# ATN reviewer notes — Mail AI Assist 0.12.24

## Package and update channels

Submit Mail-AI-Assist-0.12.24-ATN.xpi using "On this site". Its ID is mail-ai-assist@lvbeck.github.com. It has no update_url. Source files are readable JavaScript/HTML/CSS; no JavaScript bundler, minifier or transpiler is used. The XPI itself contains the reviewable extension code. Its root contains manifest.json, not an enclosing project folder. No Experiment APIs are included.

The helper MSI is rebuilt as 0.12.24 for GitHub-hosted updates. RSA signature, package hash and installation-scope controls remain in place. GitHub HTTPS redirects are restricted to this repository and release-assets.githubusercontent.com, with a finite hop limit. Existing helpers require a one-time manual MSI upgrade because their installed update address and redirect policy do not change remotely. The MSI-bundled XPI also omits update_url; ATN remains the extension update channel. No native message protocol changes are introduced.

## Required Windows helper

The AI, translation, cache and export workflows require the Windows x64 helper, registered as local.mail_ai_assist. NativeMessaging is essential; the extension has no executable binary inside it.

Download page: https://github.com/lvbeck/mail-ai-assist/releases/latest

Matching installer: https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.24/Mail-AI-Assist-0.12.24-x64.msi

These are planned GitHub release URLs, not confirmation of publication. No release was uploaded during preparation. Before ATN submission, publish tag v0.12.24 with the matching MSI and signed helper-updates.json, and test public downloads. Native helper source and installer build instructions are supplied in the supplemental review archive; credentials, signing key and Node executable are excluded. An official helper release needs the existing publisher key; reproducing the ATN XPI does not.

## Reproduce the XPI

Use Python 3.10+ on a clean checkout or the extracted review-source archive. No npm packages, native runtime or private signing key are required for this command:

    python scripts/build-xpi.py --channel atn

The script copies extension assets verbatim and replaces only the archived manifest version (publication/atn.json) and ensures update_url is absent. It does not mutate the source manifest. ZIP timestamps and permissions are fixed. Compare extracted file contents across Python/zlib versions; the compressed bytes may vary between runtimes. The existing approved icon assets are inputs and need not be regenerated.

## Functional test steps

1. Use a current supported Thunderbird on Windows x64 with a synthetic test mailbox. The manifest minimum is 128.0; this preparation has not completed GUI testing across that entire version range.
2. Install the ATN XPI. Settings opens on first installation, explaining the helper dependency, remote processing and privacy policy. Automatic tags and summaries default to off. Without the helper, errors should direct users to MSI installation rather than obsolete scripts.
3. Download and manually install the helper MSI. If its final page opens the installation guide, skip its XPI-install step if the ATN extension is already installed. Restart Thunderbird and reopen settings.
4. Configure an eligible provider and model. ChatGPT authorization availability depends on the account/grant. Gemini and Claude use their respective API keys. External translation services use separately saved keys. API usage can incur charges. Test credentials are NOT included; the publisher must arrange restricted testing access through the private reviewer channel if requested. Do not publish real keys in the source or listing.
5. With synthetic email, request a summary and translation, reopen to check persistent cache, and use Retry to regenerate. Clear cache in Settings. Verify chosen output languages.
6. Request tag suggestions, edit them and confirm before applying. Test an existing tag/alias. For automation, explicitly enable the account menu checkbox and deliver a new inbox message; disable it afterward. The summary daily limit defaults to 100 per account; failed/cancelled attempts count.
7. Select draft text, request a rewrite, preview it and explicitly apply. No email is sent automatically.
8. Export TXT with/without quotes and EML with full original content. Check that the file is revealed for manual attachment, remains after closing, and can be cleared through settings.
9. Sign out/remove keys and inspect the missing-helper guidance. A browser or Thunderbird restart does not clear retained cache or exports.

## Permissions

- compose and scripting: inspect/replace explicitly selected draft content through the compose script after confirmation.
- messagesRead: selected message content/export and opted-in inbox automation.
- messagesUpdate and messagesTags: preserve existing tags and apply manual/opted-in automatic tags.
- accountsRead: identify accounts for per-account automation settings.
- menus: compose, message and account menu commands.
- storage: preferences, automation state and rules.
- nativeMessaging: local helper communication for credentials, providers, export, cache and updates.
- clipboardWrite: copy an exported file path when requested.

## Data and security review entry points

See PRIVACY.md for the full policy to paste into ATN's privacy field. Relevant files include extension/mail-content.js, mail-background.js, auto-summary.js, auto-tags.js, mail-reader.js, rewrite.js and helper/host.mjs, core.mjs, auth.mjs, providers.mjs, translation-services.mjs, result-cache.mjs, desktop-export.mjs, updater.mjs and update-core.mjs. Mail and model output are treated as untrusted content; no model tool invocation or automatic sending is implemented.

## Release checks still requiring publisher attention

- Complete clean-profile installation and real-provider testing on the Thunderbird versions claimed as supported, including an existing self-hosted installation switching to ATN.
- Ensure the remotely hosted MSI corresponds to the reviewed helper source and remains downloadable.
- Supply privately arranged testing access if the reviewer needs it; no account eligibility or successful store review is guaranteed.
- Do not submit the full supplemental archive as mandatory transformed-code source unless requested: extension JavaScript is already readable in the XPI. This archive provides build reproduction and native helper context.
