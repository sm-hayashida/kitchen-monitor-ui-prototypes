# Kitchen Monitor UI Prototypes

Kitchen Monitor の注文別表示とテーブル別表示を比較するための Vue 3 + Vite フロントモックです。

- 公開URL: <https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/>
- 比較対象: [佐々木さんのKitchen Monitorモック](https://yuukasasaki.github.io/KitchenMonitor/)
- 比較結果: [UIモック比較と検証提案](./docs/ui-comparison.md)
- 現行仕様: [UIモック機能仕様](./docs/current-mock-functional-spec.md)

固定モックデータのみを使用し、API通信・認証・実運用データは含みません。iPad横画面を中心に、見やすさ、操作量、完了・取消の分かりやすさを比較するためのものです。モックで動く内容は本番仕様の確定を意味しません。

## 比較画面

| 表示単位 | URL | 用途 |
| --- | --- | --- |
| 注文別 | [`#order-n-scroll`](https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/#order-n-scroll) | N型・横スクロール。現行の基本候補 |
| 注文別 | [`#order-n-page`](https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/#order-n-page) | N型・ページ送り。比較用 |
| 注文別 | [`#order`](https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/#order) | Z型・縦展開。比較用 |
| テーブル別 | [`#table-n-scroll`](https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/#table-n-scroll) | N型・横スクロール。現行の基本候補 |
| テーブル別 | [`#table-n-page`](https://sm-hayashida.github.io/kitchen-monitor-ui-prototypes/#table-n-page) | N型・ページ送り。比較用 |

注文別では、数量タップによる部分調理、商品詳細、同一商品の横断集計、注文全体の完了と取消を確認できます。テーブル別では、複数注文の集約、商品完了後の非表示と取消、並び替え、ピン留め、グループ化を確認できます。

## 比較パネル

画面右下の`比較`から、レビュー用の非モーダルパネルを開けます。通常の業務設定とは分けて、画面、レビュー目的別レシピ、テーマ、警告配色、強度、表示密度、表示情報、数量表現、完了・非表示時間、目標時間、期限間近、固定シナリオを同じモック上で切り替えます。

レシピは、表示・運用・状況の3グループに分けた10種類です。各レシピはシナリオ、カード幅、行間、数量、取消・非表示時間、目標時間、期限間近、motion、表示情報を完全に定義します。テーマ、警告配色、強度は独立した比較軸で、レシピ適用では変更されません。`現行値へ戻す`はレシピ項目と色項目をまとめて現行基準へ戻します。

比較値はURLハッシュのqueryに反映されます。`共有URL`でコピーしたURLは、現在の画面、シナリオ、表示情報、数量モード、タイミング、密度、行間、motion設定、テーマ、警告配色、強度を再現し、`compare=1`で比較パネルを開きます。色のURL keyは`cmp_theme`、`cmp_urgency`、`cmp_intensity`です。比較値は`localStorage`やサーバーには保存せず、本番設定として扱いません。

## ローカル起動

```bash
npm ci
npm run dev
```

確認 URL: `http://127.0.0.1:5173/`

## ビルド

```bash
npm test
npm run build
npm run preview
```

`main`へのpush時にGitHub Actionsが`dist`を生成し、GitHub Pagesへ配信します。Pagesの公開ソースはGitHub Actionsを使用します。

## 公開範囲

- 含む: Vue/Viteのソース、固定モックデータ、機能仕様、比較資料、Pagesのビルド定義
- 含まない: 顧客・店舗・注文の実データ、API接続情報、認証情報、本番アプリのコード
- 保証しない: 他端末同期、保存、オフライン、エラー処理、実際の通知音

## 主なファイル

- `src/pages/`: 比較画面単位のページコンポーネント
- `src/components/kitchen-monitor/`: 注文・テーブルカード、設定、詳細、横スクロールUI
- `src/features/kitchen-monitor/orderViewMockData.js`: 注文別表示用の固定注文データ
- `src/features/kitchen-monitor/comparisonConfig.js`: 比較値、preset、URL parse/serialize
- `src/features/kitchen-monitor/comparisonScenarios.js`: 比較用の固定シナリオ生成
- `src/features/kitchen-monitor/useOrderViewMock.js`: 数量、横断集計、完了、取消のモック状態
- `src/features/kitchen-monitor/useTableLayoutPreferences.js`: テーブルの並び順、ピン、グループ化
- `src/style.css`: iPad 横画面向けの共通スタイル
