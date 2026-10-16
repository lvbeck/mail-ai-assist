# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist 為 Thunderbird 中使用者選取的郵件提供摘要、翻譯、標籤建議與本機匯出，並支援改寫撰寫新郵件或回覆時選取的文字。擴充套件不會主動掃描整個信箱；只有在使用者明確為某個帳戶啟用對應功能後，才會為該帳戶收件匣中新收到的郵件自動產生摘要或新增標籤。

## 功能介紹

- **郵件摘要：** 為選取的郵件整理重點與待辦事項。摘要語言獨立於介面及翻譯語言，預設跟隨系統，也可在設定中指定。
- **郵件翻譯：** 可指定來源與目標語言，或自動偵測來源語言。支援以自己的 API Key 設定 Google Cloud Translation、Microsoft Azure Translator 或 DeepL；未設定翻譯服務時使用目前的 AI 模型。
- **標籤建議與別名：** 優先重用 Thunderbird 既有標籤，減少建立近似標籤。手動建議可編輯，確認後才套用。可在設定中將 `Project Alpha`、`Project Beta` 等別名對應至既有的 `Projects` 標籤；依完整名稱比對，忽略大小寫與多餘空格。
- **選取文字改寫：** 在撰寫或回覆視窗中選取文字，產生改寫並預覽，確認後才取代選取內容。擴充套件不會自動寄送郵件。
- **本機郵件匯出：** TXT 匯出郵件內容，可排除引用回覆及轉寄內容；EML 保留完整原始郵件、編碼、標頭、排版及附件，不過濾引用。匯出本身不呼叫 AI、不消耗 Token。可選擇匯出資料夾與目標桌面應用程式，並在檔案總管中選取匯出的檔案，由你手動拖入或附加至聊天；不會自動附加或傳送檔案。關閉對話框後保留檔案。
- **持久快取：** 再次開啟摘要或翻譯時重用相符的快取，重新啟動 Thunderbird 後仍有效。按「重試」才重新請求並更新快取。設定中可查看大小、開啟快取資料夾或清除快取；匯出檔案另有獨立清理功能。
- **十種介面語言：** 英文、德文、法文、義大利文、西班牙文、葡萄牙文、簡體中文、繁體中文、日文與韓文。

## 可選的新郵件自動處理

所有帳戶的自動摘要與自動標籤均**預設關閉**。在 Thunderbird 的帳戶名稱上按右鍵，透過「AI 助手」選單分別啟用。僅處理已啟用帳戶收件匣中新收到的郵件，不掃描歷史郵件，並略過已標記為垃圾郵件的郵件。

自動摘要儲存至快取，供稍後檢視。自動標籤依既有標籤與別名規則直接套用，不像手動建議需要逐封確認。自動處理使用目前選擇的服務商、模型及對應輸出語言，會將郵件內容傳送至該服務並消耗額度。自動摘要預設每個帳戶每天最多嘗試 100 次，可在設定中調整；失敗或取消也計入次數。此限制僅適用於自動摘要，不適用於自動標籤。

摘要、翻譯與標籤處理郵件主旨及內文，不讀取附件內容。AI 結果可能有誤，使用前請核對。

## 服務商與隱私

支援 ChatGPT 授權、Gemini API、Claude API。翻譯可選 Google Cloud Translation、Azure Translator、DeepL；未選取或未設定翻譯服務時使用目前 AI 模型，服務失敗不自動切換。帳戶資格與費用依服務商而定。相關郵件內容經 Windows 輔助程式傳送至所選服務商；憑證使用 Windows DPAPI，快取與匯出檔案可在本機讀取。詳見[隱私權政策](publication/PRIVACY.md)。

## 安裝與匯出

Windows 與 macOS 使用相同的 Thunderbird XPI，另外安裝適合作業系統的輔助程式。

### 下載 · v0.12.26

- [Windows x64 · MSI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-x64.msi)
- [macOS Apple Silicon (arm64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-arm64-unsigned.pkg)
- [macOS Intel (x64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-x64-unsigned.pkg)
- [Thunderbird · XPI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26.xpi)

下載下方與你的系統相符的輔助程式和 Thunderbird XPI。安裝輔助程式後，在 Thunderbird → 附加元件與佈景主題 → 擴充套件 → 齒輪選單 → 從檔案安裝附加元件中選擇 XPI，然後重新啟動 Thunderbird。

macOS 13+ 安裝套件尚未進行 Apple 簽章和公證。Mac 實機的完整安裝、登入及 Thunderbird 整合測試尚未完成，macOS 自動更新尚未啟用。

擴充套件上架 ATN 後可從商店安裝，也可於附加元件管理員手動安裝本機 XPI。manifest 最低版本為 Thunderbird 128，部署前需測試實際版本。TXT 可排除引用；EML 保留原始郵件及附件。設定可選匯出目錄，匯出後選取檔案供手動附加。關閉視窗不刪除檔案，可在設定清理本擴充套件的匯出。

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

將 dist/github-release/v0.12.26/ 內檔案逐一上傳為 Release 附件，不要只上傳 ZIP。ATN XPI 另外提交並選 On this site。參閱[審核說明](publication/REVIEW-NOTES.md)、[商店介紹](publication/LISTING.md)、[發布流程](publication/GITHUB-RELEASE.md)。腳本不會自動推送、上傳或安裝。私鑰、憑證、郵件與快取不得入庫；.gitignore 不會移除已提交秘密。MIT，見 [LICENSE](LICENSE)。

## macOS 支援 · 0.12.26

Mac 安裝套件將 Mail-AI-Assist.xpi 和 setup-guide.html 放在 /Library/Application Support/MailAiAssist。安裝完成後會盡可能為目前登入的桌面使用者開啟指南；若未開啟，請在 Finder 中開啟此目錄。在 Thunderbird 中手動安裝 XPI 並確認權限。

macOS 13+ 安裝套件尚未進行 Apple 簽章和公證。Mac 實機的完整安裝、登入及 Thunderbird 整合測試尚未完成，macOS 自動更新尚未啟用。

[macOS 建置與測試說明](installer/macos/README.md)
