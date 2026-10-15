# ATN 擴充套件介紹草稿 — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## 簡短介紹

為選取的郵件產生摘要、翻譯與標籤建議；可按帳戶啟用新郵件自動處理。

## 詳細介紹

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

支援 ChatGPT 授權、Gemini API、Claude API。翻譯可選 Google Cloud Translation、Azure Translator、DeepL；未選取或未設定翻譯服務時使用目前 AI 模型，服務失敗不自動切換。帳戶資格與費用依服務商而定。相關郵件內容經 Windows 輔助程式傳送至所選服務商；憑證使用 Windows DPAPI，快取與匯出檔案可在本機讀取。詳見[隱私權政策](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)。

## 安裝與匯出

需要 Windows x64 輔助程式。從 [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases) 下載 MSI，安裝後重新啟動 Thunderbird。擴充套件上架 ATN 後可從商店安裝，也可於附加元件管理員手動安裝本機 XPI。manifest 最低版本為 Thunderbird 128，部署前需測試實際版本；連結不表示已發布。TXT 可排除引用；EML 保留原始郵件及附件。設定可選匯出目錄，匯出後選取檔案供手動附加。關閉視窗不刪除檔案，可在設定清理本擴充套件的匯出。

授權條款: MIT

支援信箱: it@live.cn

Windows 輔助程式: https://github.com/lvbeck/mail-ai-assist/releases/latest
