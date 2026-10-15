# Suggested ATN listing

Name: Mail AI Assist

Summary: Summarize, translate, tag and rewrite emails, with local TXT/EML export.

Description:
Mail AI Assist adds email summaries, translation, tag suggestions and selected-text rewriting to Thunderbird. You choose the provider and model. Automatic summaries and tags are optional, disabled by default, and enabled per account. Rewriting is previewed before applying; the extension never sends messages automatically.

Requires a separately installed Windows x64 helper (MSI). Download and installation instructions appear in settings on first installation. AI features send relevant email content through this helper to your chosen provider. Provider authorization or API keys are required; subscription eligibility and API charges depend on the provider. Google Cloud Translation, Microsoft Azure Translator and DeepL can be selected for translation, otherwise the selected AI model is used.

Summary/translation cache and TXT/EML exports persist locally and can be cleared in settings. EML exports include the original attachments. Export does not invoke an AI model or automatically upload the file; attach it manually in your chosen desktop application.

Thunderbird handles ATN extension updates. The Windows helper is installed and updated separately. See the full privacy policy for data handling and retention.

License: MIT
Support contact: it@live.cn
Helper download: https://github.com/lvbeck/mail-ai-assist/releases/latest

Release notes for 0.12.24:
- ATN extension updates use Thunderbird's default update service.
- First-install settings explain the Windows MSI helper dependency and remote processing.
- Eight-language setup guidance replaces obsolete helper scripts.
- A local privacy policy is available from settings.
- Helper 0.12.24 supports restricted GitHub download redirects while retaining signed updates. Existing helper installations need a one-time manual upgrade.

Publisher instructions (do not paste this paragraph into the public listing): paste the full PRIVACY.md policy into the ATN privacy field, select Thunderbird and the Windows platform where offered, and use REVIEW-NOTES.md for private reviewer comments. Attach screenshots of this release. No GitHub URL is supplied until the repository has actually been published.
