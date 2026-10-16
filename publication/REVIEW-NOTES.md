# ATN reviewer notes — Mail AI Assist 0.12.25

## Package and update channels

Submit Mail-AI-Assist-0.12.25-ATN.xpi using "On this site". Its ID is mail-ai-assist@lvbeck.github.com. It has no update_url. Source files are readable JavaScript/HTML/CSS; no JavaScript bundler, minifier or transpiler is used. The XPI itself contains the reviewable extension code. Its root contains manifest.json, not an enclosing project folder. No Experiment APIs are included.

The helper MSI is rebuilt as 0.12.25 for GitHub-hosted updates. RSA signature, package hash and installation-scope controls remain in place. GitHub HTTPS redirects are restricted to this repository and release-assets.githubusercontent.com, with a finite hop limit. Existing helpers require a one-time manual MSI upgrade because their installed update address and redirect policy do not change remotely. The MSI-bundled XPI also omits update_url; ATN remains the extension update channel. No native message protocol changes are introduced.

## Required Windows helper

The AI, translation, cache and export workflows require the Windows x64 helper, registered as local.mail_ai_assist. NativeMessaging is essential; the extension has no executable binary inside it.

Download page: https://github.com/lvbeck/mail-ai-assist/releases/latest

Matching installer: https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.25/Mail-AI-Assist-0.12.25-x64.msi

GitHub release v0.12.25 is published as a public, non-prerelease release:
https://github.com/lvbeck/mail-ai-assist/releases/tag/v0.12.25

The release includes the matching Windows x64 MSI, the standard-distribution XPI, the signed helper update manifest and SHA-256 checksums:

- Installer: https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.25/Mail-AI-Assist-0.12.25-x64.msi
- Signed helper update manifest: https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.25/helper-updates.json
- Checksums: https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.25/SHA256SUMS.txt

The submitted extension package is Mail-AI-Assist-0.12.25-ATN.xpi, built for the ATN channel. Native helper source and installer build instructions are supplied in the supplemental review archive; credentials, the private signing key and the Node executable are excluded. An official signed helper release needs the existing publisher key; reproducing the ATN XPI does not.

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

## Changes in 0.12.25

Added GitHub and local privacy-policy links and a voluntary Buy Me a Coffee support button at the bottom of About. Support text is localized in all ten interface languages. The donation link opens only after a user click; no remote donation script or embedded payment widget is loaded. Donations do not unlock or restrict features. No permissions, AI processing or native messaging protocol changes were introduced.

## Automated validation warnings

The previous v0.12.24 submission passed ATN validation with zero errors and six warnings. The same permissions and HTML extraction code remain in v0.12.25; its actual validation result must be checked on upload. The warnings are addressed below for manual review; passing automated validation is not a claim of review approval.

Five warnings report unrecognized permissions in manifest.json: compose, messagesRead, messagesUpdate, messagesTags and accountsRead. These are documented Thunderbird MailExtension permissions, not custom permissions or Experiment APIs. Their uses are described in the Permissions section above. They are retained because removing them would disable the corresponding features.

Official references:
- https://webextension-api.thunderbird.net/en/mv2/compose.html
- https://webextension-api.thunderbird.net/en/mv2/messages.html
- https://developer.thunderbird.net/add-ons/mailextensions/supported-webextension-api

The sixth warning, "Unsafe assignment to innerHTML", points to mail-content.js, line 13: template.innerHTML = html. This parses untrusted email HTML into a detached HTML template for plain-text extraction. Neither the template nor the parsed fragment is attached to the live document. This is not an assignment that renders email HTML in the extension UI.

The extraction code removes scripts, embedded content, media elements and detected hidden content before obtaining textContent. Embedded styles are inspected using a constructed stylesheet that is never adopted into a document; replaceSync discards external @import rules. Input size, node count, CSS rule count and nesting limits bound processing. The callers in mail-background.js use the fragment for text extraction, including optional quote removal, rather than inserting it into the live DOM.

Please review this assignment in its detached-template context. The filtering is for text extraction and is not intended as a general-purpose HTML sanitizer or a claim that arbitrary mail HTML is safe to render. Extracted mail text remains untrusted input for AI processing.

## Data and security review entry points

See PRIVACY.md for the full policy to paste into ATN's privacy field. Relevant files include extension/mail-content.js, mail-background.js, auto-summary.js, auto-tags.js, mail-reader.js, rewrite.js and helper/host.mjs, core.mjs, auth.mjs, providers.mjs, translation-services.mjs, result-cache.mjs, desktop-export.mjs, updater.mjs and update-core.mjs. Mail and model output are treated as untrusted content; no model tool invocation or automatic sending is implemented.

## Release checks still requiring publisher attention

- Complete clean-profile installation and real-provider testing on the Thunderbird versions claimed as supported, including an existing self-hosted installation switching to ATN.
- Ensure the remotely hosted MSI corresponds to the reviewed helper source and remains downloadable.
- Supply privately arranged testing access if the reviewer needs it; no account eligibility or successful store review is guaranteed.
- Do not submit the full supplemental archive as mandatory transformed-code source unless requested: extension JavaScript is already readable in the XPI. This archive provides build reproduction and native helper context.
