# GitHub and ATN release procedure

Repository: https://github.com/lvbeck/mail-ai-assist

Prepared version: 0.12.26. Nothing is uploaded by the build scripts.

1. Build the MSI with the existing DPAPI signing key, then run finalize-release.py and verify-release.mjs. Build the ATN XPI; generate the supplemental review archive only for review on request. Keep existing installers untouched.
2. After separate authorization to publish, create a public, non-prerelease GitHub release tagged v0.12.26. Upload the individual files from dist/github-release/v0.12.26/, especially Mail-AI-Assist-0.12.26-x64.msi and helper-updates.json. Do not upload only a ZIP: the updater requests named assets directly. The XPI may be offered for manual installation but ATN handles extension updates.
3. Mark the release Latest only when all assets are present. Later stable releases must likewise include a correctly signed helper-updates.json referencing their versioned MSI. Do not mark documentation-only or incomplete releases Latest.
4. Check https://github.com/lvbeck/mail-ai-assist/releases/latest/download/helper-updates.json and the versioned MSI URL, including redirects, from an unauthenticated client. Verify the downloaded MSI hash against the signed manifest. Current package checks do not prove these unpublished URLs work.
5. Submit the ATN XPI separately using On this site, paste the full privacy policy, and supply reviewer notes/testing access as needed. The manifest ID is unchanged and update_url is absent, including in the MSI-bundled XPI.
6. Existing helper users must manually install the new MSI once. Old MSI files retain the old server URL and cannot follow GitHub redirects; uploading them to GitHub does not migrate their embedded configuration. Old self-hosted extensions should install the same-ID ATN XPI once to switch update channels. Do not delete the old server until you have handled any users who still depend on it, or accept that they need manual downloads.

Security: only HTTPS redirects within this GitHub repository and to release-assets.githubusercontent.com are allowed, at most four redirects. Other download origins still reject redirects. Signatures, exact versioned asset URLs, maximum sizes and SHA-256 remain checked. No authorization token is sent to GitHub; public release assets are required. Forks must adapt repository validation and supply their own identity, release configuration and signing key.

Read README.md for build prerequisites. Supplemental review sources omit test files; test commands are for the full development repository. Never upload the signing key, credential state, caches, user mail or private build directories.

Mac releases additionally require the two validated, signed/notarized PKGs, helper-updates-macos-arm64.json, helper-updates-macos-x64.json and their checksum files. See installer/macos/README.md. Do not mark a release as supporting macOS until real-device checks pass. Current settings honestly identify the Mac installers as unpublished; remove that notice in all ten languages only when installers are available.
