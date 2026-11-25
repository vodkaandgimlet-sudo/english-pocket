# 英語ポケット — GitHub Pages 公開用

スマホで使う英単語・熟語・前置詞・文法の学習用PWAです。**GitHub Pagesへの公開はまだ行っていません。**

## GitHubへの配置方法

1. GitHubで `english-pocket` という Public リポジトリを作る（README・.gitignoreの自動追加は不要）。
2. リポジトリの `Add file` → `Upload files` をクリック。
3. この ZIP を解凍し、**中身のファイル**をすべてアップロードする（フォルダ自体はアップロードしない）。
4. `Commit changes` で保存。
5. `Settings` → `Pages` → `Build and deployment` → `Deploy from a branch` を選び、`main` と `/(root)` を選択して `Save`。
6. Pages に表示される公開 URL を開く。通常は `https://<GitHubユーザー名>.github.io/english-pocket/`。
7. iPhone の Safari で公開URLを開く → 共有 → `ホーム画面に追加` → `Webアプリとして開く` をオン → `追加`。

※リポジトリ名を変更したらURLの末尾も変わります。発行まで数分かかる場合があります。

## ファイル構成

- `index.html` — アプリ画面、問題、学習履歴の保存
- `manifest.webmanifest` — ホーム画面追加時の名称・表示設定
- `sw.js` — オフライン利用用のキャッシュ
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `icon.svg` — アイコン
- `.nojekyll` — 静的ファイル配信のための設定
- `README.md` — この説明

## 重要な点

- 現時点では、学習履歴はブラウザ（ホーム画面から開いたWebアプリ）の**端末内localStorage**に保存します。GitHubやNotionには送信されません。
- Safariとホーム画面アプリの保存領域が別々になることがあるため、**学習はホーム画面アプリから行う**ことを推奨します。
- アプリを削除したりWebサイトデータを消去したりすると履歴が消える可能性があります。学習記録画面から定期的にJSONバックアップを保存してください。
- 初回表示時はネット接続が必要です。一度キャッシュされればオフラインでも使える設計ですが、iOSのキャッシュ削除・OS設定などによって利用できなくなる場合があります。
- 更新を反映するには、`sw.js` の `CACHE_NAME` を `v3` などに変えて再公開し、アプリを再起動するのが確実です。
- 公開されたGitHub Pagesのソースは第三者も閲覧できます。Notion APIトークン、個人情報、パスワードなどを**絶対に**ファイルに書き込まないでください。
- 今後Notionと自動同期する場合は、別途認証・サーバー側の安全な連携処理が必要です。

## v1.1 表示改善
- 回答後の「次の問題へ」／「結果を見る」ボタンを画面下部のナビゲーションのすぐ上に固定し、解説が長くてもスクロールなしで押せるようにしました。
- 更新後はiPhoneのホーム画面アプリを終了して開き直してください。学習履歴の保存形式は変更していません。

## v1.3 Notion学習ログ同期（初回だけ設定が必要）
Notion学習ログDB:
https://app.notion.com/p/4182b8a1b3dd81f3aeaac6a78ab17ce8

### セキュリティ上の注意
- GitHub Pagesは公開サイトです。NOTION_TOKEN・SYNC_KEYはGitHubのファイルに書かないでください。
- Notionの連携トークンは**Cloudflare Worker の Secret**だけに登録してください。
- SYNC_KEYはNotionトークンとは別のランダムな32文字以上の値を自分で作り、Cloudflare SecretとiPhoneアプリ内の設定に入力します。チャットで共有しないでください。
- 学習結果は設定後に初めてNotionへ送られます。過去の学習セッションは別形式で保存されていたため、この版では自動遡及しません。

### 1. Notion内の専用インテグレーションを用意
1. https://www.notion.so/profile/integrations (または Notion integrations の画面)で内部インテグレーションを新規作成。
2. 対象のワークスペースを選び、ページの読み取りと書き込み権限を許可。
3. Notionの「英語ポケット｜学習ログ」データベースを開き、Connections（接続）メニューから作成したインテグレーションを接続します。
4. インテグレーションのAPIトークンをCloudflare Workerの NOTION_TOKEN Secret にだけ保存します。

### 2. Cloudflare Workerのデプロイ
1. https://dash.cloudflare.com/ にログインし、Workers & Pages → Create Worker（Create application など表示差あり）から新規Workerを作成します。名前例は english-pocket-sync 。
2. Workerの編集画面に、このリポジトリの cloudflare-worker.js の全文を貼り、Deploy（デプロイ）します。
3. Worker → Settings → Variables and Secrets から以下を追加します。
   - NOTION_TOKEN : Secret、Notion専用インテグレーショントークン
   - SYNC_KEY : Secret、独自に作った32文字以上のランダム文字列
   - NOTION_DATA_SOURCE_ID : Text、4182b8a1-b3dd-8184-a188-000b878d8859
4. 保存してDeployします。Cloudflareが発行したWorker URL（https://...workers.dev）を控えます。
5. iPhoneの英語ポケット → 記録 → Notion自動同期でWorker URLとSYNC_KEYを入力し、「同期設定を保存」→「接続確認」を押します。NotionのNOTION_TOKENを入力してはいけません。
6. 5問解くと自動で1セッションがNotionへ記録されます。ネット接続がないときはキューに保持し、アプリ起動中にオンラインへ戻るか次回起動時に再試行します。

### トラブルシューティング
- HTTP 401: SYNC_KEYが一致していません。
- HTTP 503: Worker Secrets が未設定。
- HTTP 502: Notion接続権限かデータソースID、Notionインテグレーションの設定を確認。
- 同期失敗でも端末内の学習履歴は残ります。「記録」画面から再同期できます。
- スマホで旧画面が残る場合、GitHub Pagesの反映を待ち、アプリを終了して再起動します。

### 保存するデータ
1回の5問終了ごとに、日付、問題分野、回答数、正解数、正答率、間違えた問題、および各問題の回答・正解をNotionの新しい「英語ポケット｜学習ログ」データベースに記録します。

## v1.8 英作文・Cloudflare Workers AI（無料枠）
- 英作文の2モード：日本語のお題を英語で回答（30問）、自由英文をAI添削。
- 文法・自然さを分けて添削し、日本語訳・改善案を表示。Cloudflareの小型AIモデルのため、判定の誤りが起きる可能性があります。
- **OpenAI APIキーは不要**。Cloudflare Workers AIを使います。
- 無料枠：Cloudflare Workers AIはFreeプランで合計10,000 Neurons/日（モデルによって消費量が異なる）。超過分の処理は失敗し、有料プランへの変更は自動では行われません。最新の制限はCloudflareの公式料金表を確認してください。
- 既存のNotionへの5問終了時の同期は変更しません。英作文の入力・添削内容は端末内に保存され、Notionには自動保存されません。

### 既存WorkerにAIバインディングを追加（初回）
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Worker `english-pocket-sync` を選択します。
2. Settings → Bindings（表示によっては右側の `Bindings` タブ）→ Add binding をクリックします。
3. `Workers AI` を選択し、Variable name / Binding name を **`AI`** として保存・デプロイします。これはSecretではありません。APIキーも不要です。
4. GitHubにある [`cloudflare-worker.js`](./cloudflare-worker.js) の全文をWorkerの Edit code に貼って **Deploy** します。
5. **既存の** `NOTION_TOKEN`、`SYNC_KEY`、`NOTION_DATA_SOURCE_ID` はそのまま残します。`OPENAI_API_KEY` は不要です。すでに設定した場合は削除できます。
6. iPhoneの英語ポケットを一度終了し、更新後のアプリを開いて、英作文に短文を入力して添削を確認します。既存の「記録」画面に保存済みのWorker URLと同期専用キーは流用します。

### モデル・実装
- Workerの`/correct` は `env.AI.run('@cf/meta/llama-3.1-8b-instruct', ...)` を使用します。
- Cloudflare Workers AIのJSON Modeを使い、`corrected`、`translation`、`grammarAssessment`、`naturalnessAssessment`、`grammarExplanation`、`naturalnessExplanation`、`alternative`、`encouragement` の形式で結果を返します。
- Workerへのリクエストは既存の `X-Sync-Key` で認証します。ユーザーに入力させるのは既存の同期専用キーのみです。
- 英文と日本語のお題は添削のためCloudflare Workers AIに送信されます。機密情報・個人情報を入力しないでください。
- アプリ・GitHubに認証用の値を追加しないでください。

### 不具合時
- 「AIバインディングを追加してください」: Worker設定に`AI`という名前のWorkers AI Bindingがあるか、最新WorkerコードがDeployされているか確認。
- HTTP 502: 推論・AI出力エラーの可能性があります。短い英文で再試行してください。
- 上限超過時: 無料プランでは、その日のAI処理が失敗することがあります（無料枠のリセットはUTC日付基準）。
- Notion同期が失敗した場合は、従来の`NOTION_TOKEN`、`SYNC_KEY`、`NOTION_DATA_SOURCE_ID`の設定も確認してください。

## v2.7 英作文・弱点ログのNotion自動同期

「お題に答える」「自由に作文」の両モードで、AI添削が正常に確定した場合だけ個人用Notionの英作文専用DBに自動保存します。

- DB名：英語ポケット｜英作文・弱点ログ
- NotionデータソースID：`4237e8a4-a9e3-8116-8392-000b28c53fcd`
- DB： https://app.notion.com/p/4237e8a4a9e381f4b017e637f1c31212
- 保存する内容：学習日、原文、モード、課題/確認した意図、文法指摘、最小限の修正文、自然な英文、日本語訳、復習テーマ、復習状況（初期値：未復習）、添削エンジン
- 添削が保留になった場合、意図を選ぶ途中では保存せず、確定後に記録します。
- 未送信データはiPhone内の別キューに保管して再送信可能です。通信復旧時または「未送信を再送信」で同期します。
- 記録IDに基づく重複チェックがあります。以前の端末内の英作文履歴は自動バックフィルしません。
- 既存の4択問題「英語ポケット｜学習ログ」への同期には影響しません。

### 設定（Cloudflare更新）

1. Notion個人スペースのDB「英語ポケット｜英作文・弱点ログ」を開き、ページ右上の `...` → `コネクト` / `Connections` → `English Pocket Sync` を追加して、API接続にアクセス権を付与します。DB側に表示される操作名はNotion UIの言語により異なります。
2. Cloudflare → Workers & Pages → `english-pocket-sync` → Settings → Variables and secrets → Add variableで、`NOTION_WRITING_DATA_SOURCE_ID`（通常のテキスト変数）を追加し、値を `4237e8a4-a9e3-8116-8392-000b28c53fcd` にしてDeployします。
3. 既存の `NOTION_TOKEN`、`NOTION_DATA_SOURCE_ID`、`SYNC_KEY`、Workers AI binding `AI` は**変更しません**。
4. GitHubの `cloudflare-worker.js` 全文をCloudflare Workerのコードに貼り直してDeployします。
5. iPhoneのアプリを再起動して、英作文を1件添削します。表示される「英作文のNotion同期が完了しました」を確認し、Notionの新DBに1行登録されたかを確認してください。

※ 英作文のNotion自動同期には、既存の「記録」画面に保存済みのWorker URLとSYNC_KEYを使います。NotionのAPIトークンをiPhoneに入力しないでください。

### 英会話レッスンへの反映

Notionの12週間カリキュラムを基本とし、レッスン開始時に①レッスン進捗DB、②英作文・弱点ログの未復習行、③4択学習ログの苦手分野を参照し、4分程度の前回復習と会話練習の質問に反映します。**この読み取り処理は英語ポケットのコードには含まれません**。ChatGPT音声レッスン側から個人用Notionを参照する必要があります。
