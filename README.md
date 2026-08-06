# Kitchen Monitor UI Prototypes

Kitchen Monitor の注文別・テーブル別カードUI、後方互換のリスト型、調理済み履歴を比較するための Vue 3 + Vite フロントモックです。

固定モックデータのみを使用し、API通信や実運用データは含みません。iPad横画面での比較確認を想定しています。

## レビュー画面

- 注文別
  - [`#order-n-scroll`](./#order-n-scroll): N型・横スクロール（採用方針）
- テーブル別
  - [`#table-n-scroll`](./#table-n-scroll): N型・横スクロール（採用方針）
- 後方互換
  - [`#list`](./#list): 稼働中Kitchen Monitor相当のリスト型
  - [`#list-modern`](./#list-modern): 現行リストと同じ機能を持つ新UIリスト型
- 調理済み
  - [`#completed`](./#completed): 商品・注文・テーブル単位で検索・ソートできる履歴

未指定URLや旧URLは`#order-n-scroll`へフォールバックします。

注文・テーブルは3列／4列（既定4列）で、横スワイプに加えて1列単位と表示幅単位の矢印移動を使えます。数量操作は同一商品の注文別内訳モーダルへ統一し、6個以下／7個以上／1ページ8注文の境界を暫定表示します。右下の「比較」では数量表示、商品タップ、現行／新案の時間境界、配色、固定データなどを比較できます。ヘッダーの歯車からは、取消可能時間を注文・商品・リスト共通で1〜100秒から設定できます（既定5秒）。

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
- `src/features/kitchen-monitor/useColumnLayoutPreference.js`: 3列・4列の表示設定
- `src/style.css`: iPad 横画面向けの共通スタイル
