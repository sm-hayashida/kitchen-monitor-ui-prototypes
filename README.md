# Kitchen Monitor UI Prototypes

Kitchen Monitor の注文別表示とテーブル別表示を比較するための Vue 3 + Vite フロントモックです。

固定モックデータのみを使用し、API通信や実運用データは含みません。iPad横画面での比較確認を想定しています。

## 比較画面

- 注文別
  - [`#order-n-scroll`](./#order-n-scroll): N型・横スクロール（基本候補）
  - [`#order-n-page`](./#order-n-page): N型・ページ送り
  - [`#order`](./#order): Z型・縦展開
- テーブル別
  - [`#table-n-scroll`](./#table-n-scroll): N型・横スクロール（基本候補）
  - [`#table-n-page`](./#table-n-page): N型・ページ送り

未指定URLや旧URLは`#order-n-scroll`へフォールバックします。

数量は「対象商品の残数 / 全注文の同一商品未調理合計」で表示します。設定では表示部門、テーブルグループ化、比較レイアウト、カード列数を変更できます。

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
- `src/components/kitchen-monitor/`: 注文・テーブルカード、設定、詳細、横スクロール
- `src/features/kitchen-monitor/orderViewMockData.js`: 注文別表示用の固定注文データ
- `src/features/kitchen-monitor/useOrderViewMock.js`: 商品横断集計、完了、取消のモック状態
- `src/features/kitchen-monitor/useResponsiveColumnLayout.js`: 利用可能幅に応じた列数計算
- `src/features/kitchen-monitor/useColumnLayoutPreference.js`: 自動・1〜3列の表示設定
- `src/style.css`: iPad 横画面向けの共通スタイル
