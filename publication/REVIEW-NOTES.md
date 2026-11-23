Mail AI Assist 0.12.31
Add-on ID: mail-ai-assist@lvbeck.github.com
Native host: local.mail_ai_assist
Contact: it@live.cn

Response to the 0.12.30 review (rewrite.js, previously line 290)

We removed the remote HTTP confirmation override. The XPI checks the destination in ollama-server.js before it requests a model list or dispatches inference. The native host independently validates the destination in helper/ollama.mjs before fetch, for both GET /api/tags and POST /api/chat, and refuses redirects. Saved addresses are checked again for compose, message reader, automatic summaries and automatic tags. Reading an existing cached result does not contact the server.

To verify, enter http://192.168.1.20:11434 and click Save and refresh models. The settings should show an error before requesting the catalog or saving the address. A previously saved remote HTTP endpoint is also blocked before inference. HTTPS endpoints use the standard port unless a port is specified. Plain HTTP is limited to localhost, 127.0.0.0/8 and [::1] with an explicit port. The separate ChatGPT authorization callback listens only on 127.0.0.1 with a temporary port.

Install the submitted XPI in Thunderbird 148 or later and the 0.12.31 helper for the review machine. Restart Thunderbird. The Windows x64 MSI and the separate macOS 13+ Apple Silicon and Intel PKGs are available at https://github.com/lvbeck/mail-ai-assist/releases/tag/v0.12.31. The MSI is not Authenticode-signed. Both PKGs are unsigned and unnotarized. The bundled XPI is an optional copy for manual installation.

Test Ollama without a paid provider account
1. Start an Ollama server with an installed chat model. The reviewer may also use a trusted remote Ollama server. Only the server machine needs Ollama.
2. In the extension settings, select Ollama. The default server is http://localhost:11434. For a remote server, enter its HTTPS base URL and choose Save and refresh models. Select an installed chat model. The catalog request (GET /api/tags) sends no email content.
3. In a draft, select the sample sentence “Please send the agenda before Friday.” Request a formal rewrite. Inspect the preview and confirm replacement. The helper sends the selected text and instructions to POST /api/chat. There is no automatic send.
4. Open a synthetic message and request a summary. To test translation with Ollama, leave the separate translation service unconfigured. Automatic summaries and tags are off by default and can be enabled per account for new inbox messages.
5. An unavailable server should show an error. Switching server addresses clears the previous model selection. Local and remote endpoints use the same native messaging path.

Native messaging and data handling
The helper performs provider requests, credential protection, local caching, file export and desktop integration. Depending on the action, the extension passes selected text or message subject/body, task instructions, model and language settings, results, credentials entered for other providers, or export content and paths. EML export includes original headers and attachments. Local export performs no inference. Ollama requests reject redirects and do not include credentials from other providers. Content goes to the configured server when an inference request is made. Stored login credentials and provider keys use Windows DPAPI or macOS Keychain-backed encryption. Cache and export files are readable local files. Thunderbird manages the ATN extension update channel. Windows helper updates have separate signed metadata. The published Mac helpers are updated manually.

Source and reproduction
The XPI contains readable JavaScript, HTML and CSS. From the root of the extracted supplemental source ZIP, run with Python 3.10 or newer:
python scripts/build-xpi.py --channel atn
Output: dist/atn/Mail-AI-Assist-0.12.31-ATN.xpi
The packaged assets are included. No npm install, provider credential, or private signing key is needed to reproduce the XPI. Native helper sources are supplied for inspection. For full installer build inputs see:
https://github.com/lvbeck/mail-ai-assist/tree/v0.12.31
