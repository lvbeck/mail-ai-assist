# Local validation — Mail AI Assist 0.12.27

Date: 2026-11-04
Official tool: https://github.com/thunderbird/webext-linter
Version: 2.5.1
Tool commit: 7802ee765fc3c86fb5baec5833a47092f6ef8d00
Node runtime for linter: 24.21.0

## Results

- Project regression suite after native sanitization: 261 passed, 0 failed, including raw EML chunk byte preservation.
- Native Firefox 148.0 and Chrome 156 browser tests: 26 cases each passed; no requests to the local resource-test endpoints. Covers hidden subtrees, outer html/body attributes, CSS rules, resource nodes, quote selectors and limits.
- Python XPI channel/reproducibility test: 1 passed.
- ATN XPI: linter exit 0, 0 errors, 0 warnings, 0 findings.
- Supplemental source archive (extracted, without build outputs): linter exit 0, 0 errors, 0 warnings, 0 findings.
- Source-archive XPI reproduction: all extracted files match the ATN package.
- Removed assets absent; package-lock.json and current review notes included; generated installer pages, secrets and binaries excluded from the source archive.
- Windows MSI payload comparison, update RSA signature, MSI hash/size and XPI hash checks passed.

## Commands

```powershell
node scripts/test.mjs
node --test tests/reader-cache.test.mjs tests/google-reader.test.mjs tests/mail.test.mjs tests/toolbar.test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
node work/webext-linter/verify.js dist/atn/Mail-AI-Assist-0.12.27-ATN.xpi --report-format json
node work/webext-linter/verify.js dist/atn/Mail-AI-Assist-0.12.27-ATN.xpi --sca-root work/review-source-sethtml-0.12.27 --report-format json
python installer/finalize-release.py
node installer/verify-release.mjs
```

## Limits

No live Thunderbird GUI/provider smoke test was performed. The native engine tests are not a full Thunderbird 148 extension integration test. Validate body, selection, link and image menus in the reading pane, message tab and standalone window; verify compose and web tabs stay unaffected. The helper protocol is unchanged. No macOS PKG was rebuilt on Windows; macOS compilation requires macOS and no remote build was triggered. Existing published 0.12.26 helpers remain the documented test option. The initial Playwright Firefox build could not launch (side-by-side assembly error); the Firefox 148 test used an independently extracted official Mozilla build and an isolated Marionette profile. The original WiX WIX1000 identifier-length warning remains; MSI construction succeeded. Automated checks do not replace ATN manual review.

Validation was completed locally before the separately authorized GitHub publication. No ATN upload was performed.

Native Firefox 148 evidence: `work/firefox148-sethtml.json`. Official JSON reports: `work/linter-sethtml-0.12.27.json` and `work/linter-sca-sethtml-0.12.27.json`. MSI payload verification: `work/verify-sethtml-0.12.27.log`.
