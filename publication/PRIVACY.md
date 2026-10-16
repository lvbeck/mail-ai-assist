# Mail AI Assist Privacy Policy

Effective date: 16 October 2026
Developer and contact: Jin Lu, it@live.cn

## What this extension does

Mail AI Assist provides email summaries, translation, tag suggestions, selected-text rewriting and local email export in Thunderbird. These functions use a separately installed native helper for the operating system. The extension does not send messages automatically. AI results can be inaccurate and should be checked before use.

## Information processed and recipients

When you request a summary, translation or tags, the extension reads the relevant email subject and body. Existing tag names and configured aliases may be included in tagging instructions. Selected-text rewriting sends the selected draft text, your instructions, language, style and model selection. Automatic summaries and tags are disabled by default; enabling either for an account authorizes processing of eligible new inbox messages without a separate prompt for each message. They can be disabled from the account menu. AI operations do not process email attachments.

The extension sends this information to the local helper using Thunderbird native messaging. The helper forwards inference requests over HTTPS to the provider you select: OpenAI (ChatGPT-authorized service), Google Gemini, or Anthropic Claude. Translation can instead use Google Cloud Translation, Microsoft Azure Translator or DeepL. If no translation provider is selected or configured, translation uses the selected AI model. Provider request failures do not silently switch to another provider.

The native interface also exchanges provider settings, API keys for encrypted local storage, authentication status, generated results, cache requests, export content and local paths, and helper update commands. Account information is used to display login status. Provider credentials are sent to the relevant provider for authentication, validation, model discovery and requests. OpenAI login takes place in your browser, uses a temporary loopback callback, and may renew authorization in the background. The add-on does not read your OpenAI password.

Provider services receive connection information such as your IP address and request timing. Their own terms, retention and privacy policies apply. The OpenAI inference request sets store=false; this is not a guarantee of zero retention by the service. A subscription, eligible authorization or paid API usage may be required. No personal developer credentials are included.

## Local storage and controls

Preferences, account opt-ins and tag rules are stored in Thunderbird extension storage. Login credentials and provider keys are stored under %LOCALAPPDATA%\MailAiAssist using Windows DPAPI for the current Windows user. Signing out or removing a provider key deletes the corresponding local credentials. Sign-out attempts server revocation; when offline it may not confirm revocation.

Summary and translation results are cached persistently under %LOCALAPPDATA%\MailAiAssist\Cache. Cached results are readable local files, not protected by the credential encryption. Reopening a matching result reuses the cache; Retry requests a new result. Use Settings > Cache to open or clear these files. Clearing local cache does not delete data already processed by a provider.

TXT export creates a local file with subject, sender, recipients, date and the selected body scope. EML export preserves the complete raw message, including headers, quoted content and attachments. The default export directory is %LOCALAPPDATA%\MailAiAssist\Exports and can be changed. Exports are not automatically uploaded to an AI service and do not require an AI model. The helper may open the chosen desktop application and reveal the exported file for manual attachment. Any subsequent upload is controlled by that application and its privacy policy. Closing the dialog retains exported files. Settings can clear managed exports; other copies must be removed separately.

Uninstalling the add-on or helper does not necessarily remove retained credentials, cache or exports. Remove keys/sign out and clear or delete local files before uninstalling if you want them removed. Thunderbird settings are managed separately by Thunderbird.

## Updates and external links

The ATN edition uses Thunderbird's add-on update service for extension updates. The helper retains its independent updater: while used, it checks the configured GitHub Releases download service at most once per day, validates signed update metadata and downloaded packages, and installs according to the existing installation scope and authorization flow. These requests reveal normal connection information and the requested update resource/version to the hosting server, but do not contain email bodies or provider credentials. Download and service links are only opened when you choose them; the external site may process its own connection data and cookies.

Mail AI Assist contains no advertising or analytics telemetry. Email content is not sent to the GitHub update hosting for AI processing. Local processing and file retention still expose data to anyone with sufficient access to your operating-system account or files.

## Questions and changes

Contact it@live.cn with privacy questions. Do not include private mail, passwords or API keys in public issue reports. Future changes to data handling will be reflected in this policy and the add-on release information.

## macOS storage and updates

On macOS, credentials are AES-256-GCM encrypted under ~/Library/Application Support/MailAiAssist using an encryption key stored in the user's Keychain. Cache and default exports use the Cache and Exports subfolders and remain readable local files. Keychain access may require user approval. Windows DPAPI credentials are not migrated. The Mac updater uses separate signed architecture-specific feeds and opens macOS Installer only after the user requests installation; it does not install silently. Removing credentials does not remove the shared Keychain encryption key used for other providers.
