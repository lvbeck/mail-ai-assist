# Suggested ATN listing — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Summary

Summarize, translate and tag selected emails; optional automation for new inbox messages.

## Description

Mail AI Assist helps you work with emails you select in Thunderbird: summarize or translate a message, suggest tags, rewrite selected text in a draft, and export email locally. It does not proactively scan your entire mailbox. Automatic summaries and tags run only for new inbox messages in accounts where you explicitly enable each feature.

## Features

Right-click the message body, including links and images, to open AI Assist. Without a text selection, actions process the whole message. With a selection, summary and translation send only that text, without the subject or remaining body.

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

Choose ChatGPT authorization, Gemini API or Claude API.

The nativeMessaging permission connects Thunderbird to the separately installed local helper (local.mail_ai_assist). It exchanges the requested message subject/body or selected text, provider/model/language settings, credentials entered for authentication, AI results, cache data and export content/paths. EML export includes original headers and attachments. The helper handles provider authentication and HTTPS requests, protected credential storage, local cache and file export, and opening desktop apps. Relevant text is sent to your configured AI or translation provider; local export itself makes no AI request. Windows uses DPAPI; macOS uses Keychain-backed encryption. Cache and exports are readable local files. Provider eligibility and fees apply.

[Privacy policy](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)

## Install and export

Thunderbird 148 or later and a separately installed helper are required: Windows x64 (MSI), or macOS 13+ on Apple Silicon or Intel (separate PKGs). Download from GitHub Releases, install and restart Thunderbird. macOS packages are unsigned and not notarized; end-to-end testing is still pending. Linux is not currently supported. ATN manages extension updates; Windows retains its independent helper updater, while published macOS packages require manual updates.

[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)

License: MIT

Support: it@live.cn

https://github.com/lvbeck/mail-ai-assist/releases/latest
