# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist は Thunderbird に要約、翻訳、タグ候補、選択した文章の書き換え、ローカルでのメールエクスポートを追加します。バージョン 0.12.24 は GitHub でのヘルパー配布と ATN によるアドオン更新に対応するための準備を含みます。表示言語は既存の 8 言語に日本語と韓国語を加えた 10 言語に対応しています。

## 機能

要約の出力言語は個別に設定できます。要約と翻訳は永続キャッシュに保存され、「再試行」で再生成します。自動要約と自動タグ付けは既定で無効で、アカウントごとに受信トレイの新着メールに対して有効にできます。自動要約の既定上限はアカウントごとに 1 日 100 回です。タグ候補は既存のタグを優先し、別名ルールに対応します。書き換えは選択した下書きの文章をプレビューし、明示的な確認後に置き換えます。メールは自動送信しません。

## 提供元とプライバシー

ChatGPT 認証、Gemini API、Claude API を選択できます。翻訳は Google Cloud Translation、Azure Translator、DeepL に対応し、翻訳サービスが未選択または未設定の場合は選択した AI モデルを使用します。サービスの失敗時に自動で別の提供元へ切り替えません。利用条件と料金は提供元によって異なります。関連するメール内容は Windows ヘルパー経由で選択したサービスに送信します。認証情報は Windows DPAPI で保護します。キャッシュとエクスポートは読み取り可能なローカルファイルです。[プライバシーポリシー](publication/PRIVACY.md)を参照してください。

## インストールとエクスポート

Windows x64 ヘルパーが必要です。[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases) から MSI をダウンロードしてインストールし、Thunderbird を再起動してください。アドオンは ATN で公開後にインストールするか、アドオンマネージャーからローカル XPI を手動でインストールします。manifest の最低対応バージョンは Thunderbird 128 です。実際に使用するバージョンで動作確認してください。これらのリンクは ATN や GitHub での公開済み状態を保証しません。TXT は引用を除外して本文を出力でき、EML は元のメールと添付ファイルを保持します。エクスポート先は設定で選択できます。ファイルは手動添付のためにフォルダー内で表示され、ウィンドウを閉じても残ります。設定で本アドオンが管理するエクスポートを消去できます。

## 更新と移行

ATN がアドオンの更新を管理し、GitHub Releases がヘルパー MSI と署名済みの helper-updates.json を配布します。各リリースには vVERSION タグを使用し、最新リリースにもこの更新マニフェストを添付してください。GitHub ダウンロードは、このリポジトリ内と release-assets.githubusercontent.com への回数制限付き HTTPS リダイレクトのみを許可します。RSA 署名、ファイルサイズ、SHA-256 の検証は必須です。古いヘルパーは新しいアドレスやリダイレクト対応を自動取得できないため、一度新しい MSI を手動インストールしてください。自己配布版から ATN 版へ移行する際は同じ ID の XPI を使用します。設定の保持は Thunderbird の動作に依存します。異なる ID のアドオンからは設定を自動移行しません。現在の ID は `mail-ai-assist@lvbeck.github.com` です。今後のヘルパー更新でも、現在のユーザー／全ユーザー向けインストール方式を維持します。

## 開発

ソース構成：extension/（アドオン）、helper/（ネイティブホスト）、tests/、installer/、scripts/、publication/。dist/ は成果物、work/ は一時ファイルを格納し、どちらもコミット対象外です。Node.js 22 以降と Python 3.10 以降を使用してください。テストと XPI 作成に npm 依存関係は不要です。アイコンを再生成する場合のみ npm install と npm run icons を実行してください。

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI のビルド

Windows x64、Windows SDK を含む MSVC C++ Build Tools、UI/Util 拡張を備えた WiX 4.0.6、node.exe と NODE-LICENSE.txt を含む独立した Node ランタイムフォルダーが必要です。リポジトリのルートから実行してください。WIX_EXE と VCVARS64 でツールの自動検出を上書きできます。以下のパスを自身のランタイムと既存の DPAPI 署名鍵に合わせて変更してください。既存のインストール向けに署名鍵を作り直さないでください。

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

## 公開

単一の ZIP ではなく、dist/github-release/v0.12.24/ 内の各ファイルをリリースアセットとしてアップロードしてください。ATN XPI は「On this site」を選んで別途提出します。[審査担当者向け説明](publication/REVIEW-NOTES.md)、[掲載情報](publication/LISTING.md)、[リリース手順](publication/GITHUB-RELEASE.md)を確認してください。スクリプトは自動で push、アップロード、インストールを行いません。鍵、認証情報、メール、キャッシュを Git に含めないでください。.gitignore はすでにコミットされた機密情報を削除しません。MIT ライセンス：[LICENSE](LICENSE)。
