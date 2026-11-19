# Mail AI Assist 0.12.28

- Added OpenAI API as a separate model provider alongside ChatGPT subscription authorization, Gemini API and Claude API.
- Verify and encrypt your own OpenAI API key locally, list text-model choices from your account, and retain independent model selections for each provider.
- Use OpenAI API for selected-text rewriting, email summaries, translation, tag suggestions and optional new-mail automation through the Responses API with store=false.
- Reject incomplete, refused, empty and oversized results. API failures do not switch to subscription authorization or another provider.
- Added provider controls and usage notices in all ten interface languages, and updated the privacy policy.

Requires Thunderbird 148 or later and the updated 0.12.28 helper for OpenAI API support. Update both the XPI and Windows x64 MSI. Existing provider credentials and preferences are retained by the existing upgrade flow.

Validation: 282 Node.js regression tests passed before packaging. Real OpenAI account requests, Thunderbird GUI integration and MSI installation/upgrade acceptance remain unverified. Windows update-manifest signing does not imply Windows Authenticode or ATN signing of the installation files.
