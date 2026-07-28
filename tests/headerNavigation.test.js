import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const horizontalScrollerVue = readFileSync(
  new URL('../src/components/kitchen-monitor/HorizontalColumnScroller.vue', import.meta.url),
  'utf8',
);
const orderWorkspaceVue = readFileSync(
  new URL('../src/components/kitchen-monitor/OrderViewWorkspace.vue', import.meta.url),
  'utf8',
);
const tableWorkspaceVue = readFileSync(
  new URL('../src/components/kitchen-monitor/TableViewWorkspace.vue', import.meta.url),
  'utf8',
);
const styleCss = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const headerNavigationUrl = new URL(
  '../src/components/kitchen-monitor/HeaderLayoutNavigation.vue',
  import.meta.url,
);
const headerNavigationVue = existsSync(headerNavigationUrl)
  ? readFileSync(headerNavigationUrl, 'utf8')
  : '';

function headerActionsTemplate(source) {
  return source.match(/<template #header-actions>([\s\S]*?)<\/template>/)?.[1] ?? '';
}

function cssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return styleCss.match(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

test('horizontal scroll navigation is owned by the scroller and rendered through header actions', () => {
  assert.ok(
    existsSync(headerNavigationUrl),
    'HeaderLayoutNavigation.vue should provide the compact header navigation controls',
  );
  assert.doesNotMatch(
    horizontalScrollerVue,
    /<footer[\s\S]*class="horizontal-scroll-navigation"/,
    'HorizontalColumnScroller should not render the bottom navigation footer',
  );
  assert.match(
    horizontalScrollerVue,
    /defineEmits\(\[[\s\S]*'visible-column-change'[\s\S]*'navigation-state-change'/,
    'HorizontalColumnScroller should emit scroll navigation state while keeping scroll ownership local',
  );
  assert.match(
    horizontalScrollerVue,
    /defineExpose\(\{[\s\S]*scrollToColumn[\s\S]*scrollByColumn/,
    'HorizontalColumnScroller should expose column navigation methods for header controls',
  );
  assert.match(headerNavigationVue, /aria-label="1列前へ"/);
  assert.match(headerNavigationVue, /aria-label="1列次へ"/);
  assert.match(headerNavigationVue, /aria-live="polite"/);
  assert.match(headerNavigationVue, /totalColumnCount[\s\S]*列/);

  for (const [name, source] of [
    ['order', orderWorkspaceVue],
    ['table', tableWorkspaceVue],
  ]) {
    const headerActions = headerActionsTemplate(source);

    assert.match(
      headerActions,
      /<HeaderLayoutNavigation[\s\S]*mode="horizontal"/,
      `${name} scroll layout should render horizontal navigation through header actions`,
    );
    assert.match(
      source,
      /@navigation-state-change=/,
      `${name} scroll layout should receive scroller-owned navigation state`,
    );
  }
});

test('paged order and table navigation moves to the header and keeps accessible page controls', () => {
  assert.ok(
    existsSync(headerNavigationUrl),
    'HeaderLayoutNavigation.vue should provide shared paged controls',
  );
  assert.match(headerNavigationVue, /aria-label="最初のページ"/);
  assert.match(headerNavigationVue, /aria-label="前のページ"/);
  assert.match(headerNavigationVue, /aria-label="次のページ"/);
  assert.match(headerNavigationVue, /aria-label="最後のページ"/);
  assert.match(headerNavigationVue, /currentPage[\s\S]*pageCount/);

  for (const [name, source] of [
    ['order', orderWorkspaceVue],
    ['table', tableWorkspaceVue],
  ]) {
    const headerActions = headerActionsTemplate(source);

    assert.match(
      headerActions,
      /<HeaderLayoutNavigation[\s\S]*mode="paged"/,
      `${name} paged layout should render pagination through header actions`,
    );
    assert.match(
      headerActions,
      /表示部門を変更/,
      `${name} header should keep the existing department filter control`,
    );
    assert.doesNotMatch(
      source,
      /<footer[\s\S]*class="[^"]*order-view-pagination/,
      `${name} paged layout should not render a bottom pagination footer`,
    );
  }

  assert.match(headerActionsTemplate(tableWorkspaceVue), /並び順/);
  assert.match(headerActionsTemplate(tableWorkspaceVue), /並び替えを開始/);
});

test('layout CSS releases footer height and keeps header actions in one row', () => {
  const topBarActionsRule = cssRule('.top-bar-actions');

  assert.doesNotMatch(orderWorkspaceVue, /reservedHeight:\s*layoutReservedHeight/);
  assert.doesNotMatch(orderWorkspaceVue, /layoutReservedHeight/);
  assert.doesNotMatch(tableWorkspaceVue, /reservedHeight:\s*props\.layout === 'n-scroll' \? 44 : 0/);
  assert.doesNotMatch(styleCss, /\.horizontal-scroll-frame \{[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) 44px;/);
  assert.doesNotMatch(styleCss, /grid-template-rows:\s*minmax\(0, 1fr\) 46px;/);
  assert.doesNotMatch(styleCss, /\.horizontal-scroll-navigation\b/);
  assert.doesNotMatch(styleCss, /\.order-view-pagination\b/);
  assert.match(
    topBarActionsRule,
    /overflow-x:\s*auto;/,
    'Header actions should be internally scrollable instead of increasing the 60px header height',
  );
  assert.doesNotMatch(
    topBarActionsRule,
    /justify-content:\s*flex-end;/,
    'Header actions should not rely on flex-end alignment because it can create unrecoverable left overflow',
  );
});
