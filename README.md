# Kitchen Monitor UI Prototypes

Kitchen Monitor の注文別・テーブル別カードUI、後方互換のリスト型、調理済み履歴を比較するための Vue 3 + Vite フロントモックです。

固定モックデータのみを使用し、API通信や実運用データは含みません。iPad横画面での比較確認を想定しています。

## 比較画面

- 注文別
  - [`#order-n-scroll`](./#order-n-scroll): N型・横スクロール（基本候補）
  - [`#order-n-page`](./#order-n-page): N型・ページ送り
  - [`#order`](./#order): Z型・縦展開
- テーブル別
  - [`#table-n-scroll`](./#table-n-scroll): N型・横スクロール（基本候補）
  - [`#table-n-page`](./#table-n-page): N型・ページ送り
- 後方互換
  - [`#list`](./#list): 稼働中Kitchen Monitor相当のリスト型
  - [`#list-modern`](./#list-modern): 現行リストと同じ機能を持つ洗練版リスト型
- 調理済み
  - [`#completed`](./#completed): 商品・注文・テーブル単位で検索・ソートできる履歴

未指定URLや旧URLは`#order-n-scroll`へフォールバックします。

数量は「対象商品の残数 / 全注文の同一商品未調理合計」で表示します。右下の「比較ラボ」ではレイアウト、列数、数量操作、注文カードとテーブル内注文の経過／残り時間表示、オレンジ基調の状態色5案、任意注文などを比較できます。ヘッダーの歯車から、稼働中Kitchen Monitorの設定11項目と新しい表示・操作設定を変更できます。

## 現行仕様の正本

画面、デザイン、操作、比較項目、設定、状態保持、回帰チェックは [`docs/current-mock-functional-spec.md`](./docs/current-mock-functional-spec.md) を正本とします。モックを変更する場合は、同じ作業でこの文書も更新してください。

## ローカル起動

```bash
npm ci
npm run dev
```

確認 URL: `http://127.0.0.1:5173/`

## ビルド

```bash
npm run build
npm run preview
```

公開用GitHubリポジトリでは、`main`へのpush時にGitHub Actionsが`dist`を生成し、GitHub Pagesへ配信します。

## 主なファイル

- `src/pages/`: 比較画面単位のページコンポーネント
- `src/components/kitchen-monitor/`: 注文・テーブルカード、共通設定、数量変更、横スクロール
- `src/pages/KitchenMonitorLegacyListPage.vue`: 稼働中画面を固定データへ移植したリスト型
- `src/features/kitchen-monitor/orderViewMockData.js`: 注文別表示用の固定注文データ
- `src/features/kitchen-monitor/useOrderViewMock.js`: 商品横断集計、完了、取消のモック状態
- `src/features/kitchen-monitor/useResponsiveColumnLayout.js`: 利用可能幅に応じた列数計算
- `src/features/kitchen-monitor/useColumnLayoutPreference.js`: 自動・2〜4列の表示設定
- `src/style.css`: iPad 横画面向けの共通スタイル
