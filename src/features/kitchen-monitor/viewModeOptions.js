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
];

export function resolveViewModeGroup(viewId) {
  return viewModeGroups.find((group) => group.views.some((view) => view.id === viewId));
}
