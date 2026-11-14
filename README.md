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
