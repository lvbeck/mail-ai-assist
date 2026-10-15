# Single multilingual MSI

`build-release.py` builds one MSI. `language-ui.wxs` defines the first page. All dialogs, controls, navigation and Segoe UI fonts are permanent, present before Windows Installer initializes its UI. `language-action.cpp` only sets localized session properties. It never inserts, deletes or updates database rows.

`ui-catalogs.json` contains the eight localized WiX 4.0.6 UI tables captured from the 0.10.1 packages. It includes scope-dialog navigation and license text. When changing those dialogs or their navigation, update this catalog as well as the corresponding source/template; do not rely on editing `scope-ui.wxs` alone. `msi-database.py extract BASELINE_DIRECTORY BASELINE_VERSION` reproduces the baseline catalog from the retained 0.10.1 packages. `build-language-action.py` compiles the catalog with the detected MSVC Build Tools into a self-contained x64 DLL using the static C runtime.

`language-resources.py` defines formatted text bindings from the eight catalogs. `msi-database.py prepare` replaces supported text fields with property references at build time, retains all native UI rows, and embeds eight static license text controls with visibility conditions. ScrollableText does not support property expansion. No runtime UI-table mutation is used. This replaces the unreliable 0.10.2 design; missing-dialog warnings are no longer expected.

Validation without installation:

- `test-language-action.py`: isolated session handles and direct native localization calls; no installation actions or registration changes.
- `check-msi.ps1`: read-only tables and in-memory path costing.
- `verify-release.mjs` and `finalize-release.py`: signatures, package hashes, extracted payloads and public upload contents.

The public download page and feeds use one canonical multilingual MSI and one XPI. Build outputs are written under `dist/`. Old per-language compatibility aliases are not generated.

Real first-install, maintenance, cancellation and upgrade flows still require validation on a test machine. Do not launch the real MSI wizard as part of automated verification without user authorization.
