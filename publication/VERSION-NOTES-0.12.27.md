# Mail AI Assist 0.12.27

- Raised the minimum Thunderbird version to 148.0 and replaced innerHTML parsing with native Element.setHTML(). Hidden subtrees are removed before text extraction; quote filtering and prompt-injection defenses are preserved. Raw EML export is unchanged.
- Added AI Assist to the message-body context menu, including links and images.
- Without selected text, use the existing whole-message actions. With selected text, summarize or translate only the selection; its cache is kept separate from whole-message results.
- Added selection action labels and privacy notices in all ten interface languages.
- Migrated deprecated tag APIs to messages.tags.list() and messages.tags.create().
- Removed three unused XPI icons and excluded generated installer pages from the supplemental review archive.
- Updated all ten ATN listing languages with nativeMessaging data disclosure and Windows/macOS installation requirements and limitations.

Requires Thunderbird 148 or later. No Experiment APIs or full-access permission. The standard messagesTagsList permission is explicitly declared for the supported tag-listing API. The helper protocol and Windows updater are unchanged. Existing 0.12.26 Windows/macOS helpers remain compatible. macOS packages are unsigned and not notarized; full physical-Mac validation is still pending. Linux is not supported.
