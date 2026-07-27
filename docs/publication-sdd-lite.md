# SDD Lite: Kitchen Monitor UIモックのGitHub Pages公開

## Purpose

- Kitchen MonitorのUI検討用モックを、社内外からURLで確認でき、ソースと仕様差分もレビューできる形で公開する。
- 注文別・テーブル別の画面を触りながら、佐々木さんのモックとの機能・比較値の違いを確認できる状態を完了とする。

## Facts And Behavior To Preserve

- 現行モックはVue 3とViteで構成され、固定モックデータだけを使用している。
- API、認証、WebSocket、本番データ、他端末同期は含まない。
- 画面入口はURLハッシュを使用するため、GitHub Pagesのサブパスでも再読み込み可能である。
- `vite.config.js`の`base`は`./`であり、生成アセットを相対パスで参照する。
- 公開元として使用した最新作業ツリーは、既存GitLabリポジトリでは未コミットだった。既存リポジトリと履歴は変更せず、公開用スナップショットとして扱う。

## Decisions

- GitHubアカウント`sm-hayashida`配下に、公開リポジトリ`kitchen-monitor-ui-prototypes`を新規作成する。
- 既定ブランチは`main`とし、GitHub ActionsでViteをビルドして`dist`をGitHub Pagesへ配信する。
- 公開URLは`https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/`とする。
- 佐々木さんのモックは外部比較対象としてリンクし、先方のコードやアセットは当方リポジトリへ複製しない。
- 比較資料では、確認済みのモック挙動、推測、未確認の本番要件を分ける。
- エラー時は以前のPagesデプロイを維持し、ビルドまたはデプロイが成功しない変更を公開済みとして扱わない。

## Compatibility And Locked Values

- Repository: `sm-hayashida/kitchen-monitor-ui-prototypes`
- Default branch: `main`
- Pages URL: `https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/`
- Default view: `#order-n-scroll`
- Other routes: `#order`, `#order-n-page`, `#table-n-scroll`, `#table-n-page`
- Build command: `npm ci`、`npm run build`
- Artifact directory: `dist`

## Implementation Shape

- 公開対象はVue/Viteソース、固定モックデータ、Markdown資料、GitHub Pagesワークフローに限定する。
- GitLab固有のCI定義、ローカル専用`AGENTS.md`、`node_modules`、`dist`は公開スナップショットへ含めない。
- READMEを現行5画面とGitHub Pagesの構成に合わせて更新する。
- `docs/ui-comparison.md`を比較・レビューの入口とし、`docs/current-mock-functional-spec.md`を触れるモック挙動の正本とする。
- 本番Kitchen Monitor、API、データ契約、同期、永続化、認証、通知音の実装は対象外とする。

## Test And Verification Strategy

- `npm ci`
- `npm run build`
- 生成された`dist/index.html`が相対アセットを参照することを確認する。
- ローカルプレビューで5つのURLハッシュを開き、表示切替、完了・取消、部門絞り込み、テーブル整理を確認する。
- 公開前に、秘密情報、本番URL、実顧客・店舗・注文データが含まれないことを検索する。
- 初回push後はGitHub Actionsの成功と公開URLのHTTP応答を確認する。

## Delivery And Stop Conditions

- Workflow: `product-change`
- Implementation: ユーザー承認済みの直接実装
- Post-review delivery: `push`
- 秘密情報や実運用データを検出した場合、同名GitHubリポジトリが既に存在した場合、ビルドが失敗した場合、GitHub認証が確認できない場合は公開を止めて判断を戻す。
