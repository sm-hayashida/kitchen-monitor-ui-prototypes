export const viewModeGroups = [
  {
    id: 'order',
    label: '注文別',
    shortLabel: '注文',
    defaultView: 'order-n-scroll',
    views: [
      { id: 'order', label: 'Z型・縦展開' },
      { id: 'order-n-page', label: 'N型・ページ' },
      { id: 'order-n-scroll', label: 'N型・横スクロール' },
    ],
  },
  {
    id: 'table',
    label: 'テーブル別',
    shortLabel: 'テーブル',
    defaultView: 'table-n-scroll',
    views: [
      { id: 'table-n-page', label: 'N型・ページ' },
      { id: 'table-n-scroll', label: 'N型・横スクロール' },
    ],
  },
  {
    id: 'list',
    label: 'リスト型',
    shortLabel: 'リスト型',
    defaultView: 'list',
    views: [
      { id: 'list', label: '現行互換・リスト型' },
      { id: 'list-modern', label: '洗練版・リスト型' },
    ],
  },
  {
    id: 'completed',
    label: '調理済み',
    shortLabel: '調理済み',
    defaultView: 'completed',
    views: [
      { id: 'completed', label: '新UI・調理済み' },
    ],
  },
];

export function resolveViewModeGroup(viewId) {
  return viewModeGroups.find((group) => group.views.some((view) => view.id === viewId));
}
