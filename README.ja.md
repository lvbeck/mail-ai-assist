# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist は、Thunderbird で選択したメールの要約、翻訳、タグの提案、ローカルへのエクスポートに加え、新規作成・返信時に選択した文章の書き換えを支援します。メールボックス全体を自動的にスキャンすることはありません。自動要約と自動タグ付けは、ユーザーが各機能を明示的に有効にしたアカウントの受信トレイに届く新着メールだけを対象にします。

## 機能

- **メール要約：** 選択したメールの要点や対応事項を整理します。要約言語は表示言語・翻訳言語とは別に設定でき、既定ではシステム言語に従います。
- **メール翻訳：** 原文と翻訳先の言語を指定するか、原文の言語を自動検出できます。自分の API キーで Google Cloud Translation、Microsoft Azure Translator、DeepL を設定できます。翻訳サービスが未設定の場合は選択中の AI モデルを使用します。
- **タグの提案と別名：** Thunderbird の既存タグを優先し、似たタグの重複作成を減らします。手動の提案は編集してから確定できます。例えば `Project Alpha` と `Project Beta` を既存の `Projects` タグに対応付けられます。別名は名前全体で照合し、大文字・小文字や余分な空白を区別しません。
- **選択した文章の書き換え：** 新規作成・返信ウィンドウで文章を選択し、書き換え結果をプレビューしてから置き換えを確定します。メールを自動送信することはありません。
- **ローカルエクスポート：** TXT はメール内容を出力し、引用された返信や転送内容を除外できます。EML は元のメール全体、文字コード、ヘッダー、書式、添付ファイルを保持し、引用を除外しません。エクスポート自体は AI を呼び出さず、トークンも消費しません。保存先とデスクトップアプリを選択でき、ファイルマネージャーで出力ファイルを選択した状態にします。チャットへのドラッグや添付は手動で行い、自動添付・送信はしません。ダイアログを閉じてもファイルは残ります。
- **永続キャッシュ：** 再度開く際は一致する要約・翻訳を再利用し、Thunderbird 再起動後も保持します。再試行すると新しい結果を要求し、キャッシュを更新します。設定で使用量の確認、フォルダーの表示、キャッシュの削除ができ、エクスポートファイルは別途整理できます。
- **10 種類の表示言語：** 英語、ドイツ語、フランス語、イタリア語、スペイン語、ポルトガル語、簡体字中国語、繁体字中国語、日本語、韓国語。

## 新着メールの自動処理（任意）

自動要約と自動タグ付けは、すべてのアカウントで**既定では無効**です。Thunderbird のアカウントを右クリックし、AI アシスタントのメニューから個別に有効にします。有効なアカウントの受信トレイに新しく届いたメールのみを処理し、過去のメールをスキャンせず、既に迷惑メールと判定されたメールはスキップします。

自動要約は後で表示するためにキャッシュへ保存します。自動タグ付けは既存タグと別名ルールに基づいて直接適用され、手動の提案とは異なり、メールごとの確認はありません。選択中のプロバイダー、モデル、各出力言語を使用し、メール内容をサービスへ送信して利用枠を消費します。自動要約の上限は既定でアカウントごとに 1 日 100 回の試行で、設定で変更できます。失敗・キャンセルも回数に含まれます。この上限は自動タグ付けには適用されません。

要約・翻訳・タグ付けは件名と本文を処理し、添付ファイルの内容は読み取りません。AI の結果には誤りがあり得るため、利用前に確認してください。

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
