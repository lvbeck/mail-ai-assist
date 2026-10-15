# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist 為 Thunderbird 提供摘要、翻譯、標籤建議、選取文字改寫及本機郵件匯出。0.12.24 將輔助程式下載遷移至 GitHub，擴充套件更新交由 ATN 管理。

## 功能

摘要語言可獨立設定。摘要與翻譯長期快取，點擊重試才重新產生。自動摘要與標籤預設關閉，可按帳戶啟用，僅處理收件匣新郵件；自動摘要預設每帳戶每日最多嘗試 100 次。標籤優先沿用既有標籤，支援別名規則。改寫先預覽，再確認取代選取文字，不會自動寄信。

## 服務商與隱私

支援 ChatGPT 授權、Gemini API、Claude API。翻譯可選 Google Cloud Translation、Azure Translator、DeepL；未選取或未設定翻譯服務時使用目前 AI 模型，服務失敗不自動切換。帳戶資格與費用依服務商而定。相關郵件內容經 Windows 輔助程式傳送至所選服務商；憑證使用 Windows DPAPI，快取與匯出檔案可在本機讀取。詳見[隱私權政策](publication/PRIVACY.md)。

## 安裝與匯出

需要 Windows x64 輔助程式。從 [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases) 下載 MSI，安裝後重新啟動 Thunderbird。擴充套件上架 ATN 後可從商店安裝，也可於附加元件管理員手動安裝本機 XPI。manifest 最低版本為 Thunderbird 128，部署前需測試實際版本；連結不表示已發布。TXT 可排除引用；EML 保留原始郵件及附件。設定可選匯出目錄，匯出後選取檔案供手動附加。關閉視窗不刪除檔案，可在設定清理本擴充套件的匯出。

## 更新與遷移

ATN 管理擴充套件更新，GitHub Releases 託管 MSI 與簽署的 helper-updates.json。發布標籤使用 vVERSION，最新發布須包含此清單。GitHub 下載只允許有限次 HTTPS 重新導向，目標限本儲存庫與 release-assets.githubusercontent.com；保留 RSA 簽章、大小與 SHA-256 驗證。舊輔助程式不會自動取得新網址與重新導向功能，須手動安裝一次新版 MSI。舊自託管擴充套件應安裝相同 ID 的 ATN XPI，設定保留依 Thunderbird 行為而定。後續輔助程式更新保留目前使用者／所有使用者流程。

## 開發

目錄：extension/ 擴充套件、helper/ 輔助程式、tests/、installer/、scripts/、publication/。dist/ 產物與 work/ 暫存不提交。需要 Node.js 22+、Python 3.10+；測試與 XPI 打包不需 npm 相依套件。僅重建圖示時執行 npm install 和 npm run icons。

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI 建置

需要 Windows x64、MSVC C++ Build Tools 與 Windows SDK、WiX 4.0.6 UI／Util 擴充，以及包含 node.exe 與 NODE-LICENSE.txt 的獨立 Node 執行環境目錄。從儲存庫根目錄執行；可用 WIX_EXE、VCVARS64 指定工具。請替換下列本機路徑並使用既有 DPAPI 私鑰，不要為既有安裝重新產生簽署金鑰。

```powershell
dotnet tool install wix --version 4.0.6 --tool-path work/wix-tools
.\work\wix-tools\wix.exe extension add WixToolset.UI.wixext/4.0.6
.\work\wix-tools\wix.exe extension add WixToolset.Util.wixext/4.0.6
$env:MAIL_AI_RUNTIME_DIR = 'D:\build-tools\mail-ai-runtime'
$env:MAIL_AI_SIGNING_KEY_FILE = 'D:\private\update-signing-key.dpapi'
python installer/build-release.py
python installer/finalize-release.py
node installer/verify-release.mjs
```

## 發布

將 dist/github-release/v0.12.24/ 內檔案逐一上傳為 Release 附件，不要只上傳 ZIP。ATN XPI 另外提交並選 On this site。參閱[審核說明](publication/REVIEW-NOTES.md)、[商店介紹](publication/LISTING.md)、[發布流程](publication/GITHUB-RELEASE.md)。腳本不會自動推送、上傳或安裝。私鑰、憑證、郵件與快取不得入庫；.gitignore 不會移除已提交秘密。MIT，見 [LICENSE](LICENSE)。
