<script setup>
import {
  BellRing,
  Database,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  comparisonDefaults,
  comparisonOptions,
  comparisonOrderTimeDisplayModeOptions,
} from '../../features/kitchen-monitor/comparisonConfig';
import { useComparisonStore } from '../../features/kitchen-monitor/comparisonState';
import { columnCountPreferenceOptions, useColumnLayoutPreference } from '../../features/kitchen-monitor/useColumnLayoutPreference';
import {
  kitchenMonitorSettingsDefaults,
  useKitchenMonitorSettings,
} from '../../features/kitchen-monitor/useKitchenMonitorSettings';
import { useOrderDepartmentSettings } from '../../features/kitchen-monitor/useOrderDepartmentSettings';
import { useTableLayoutPreferences } from '../../features/kitchen-monitor/useTableLayoutPreferences';

const emit = defineEmits(['close']);
const comparison = useComparisonStore();
const { columnCountPreference, setColumnCountPreference } = useColumnLayoutPreference();
const {
  clearOrderData,
  ordersCleared,
  restoreMockOrderData,
  saveSettings,
  settings,
} = useKitchenMonitorSettings();
const {
  departments,
  saveDepartments,
  selectedDepartmentIds,
} = useOrderDepartmentSettings();
const { sortMode, tableGroupingEnabled } = useTableLayoutPreferences();

const sections = [
  { id: 'display', label: '画面・表示', icon: Eye },
  { id: 'targets', label: '表示対象', icon: UtensilsCrossed },
  { id: 'notifications', label: '通知・時間', icon: BellRing },
  { id: 'operations', label: '完了動作', icon: SlidersHorizontal },
  { id: 'data', label: 'データ', icon: Database },
];
const activeSection = ref('display');
const query = ref('');
const closeButtonRef = ref(null);
const showClearConfirmation = ref(false);
const draftDepartmentIds = ref([...selectedDepartmentIds.value]);
const draft = reactive(createDraft());

const filteredDepartments = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  return normalizedQuery
    ? departments.filter((department) => department.name.toLowerCase().includes(normalizedQuery))
    : departments;
});

function createDraft() {
  return {
    sortOrder: settings.sortOrder,
    lineHeight: settings.lineHeight,
    hideCompletedSeconds: settings.hideCompletedSeconds,
    showCourseName: settings.showCourseName,
    showToppings: settings.showToppings,
    masterSoundEnabled: settings.masterSoundEnabled,
    newOrderSound: settings.newOrderSound,
    delayedOrderSound: settings.delayedOrderSound,
    cancelledOrderSound: settings.cancelledOrderSound,
    columnCount: columnCountPreference.value,
    tableGroupingEnabled: tableGroupingEnabled.value,
    tableSortMode: sortMode.value,
    targetMinutes: comparison.settings.targetMinutes,
    warningMinutes: comparison.settings.warningMinutes,
    orderTimeDisplayMode: comparison.settings.orderTimeDisplayMode,
  };
}

function resetDraft() {
  Object.assign(draft, {
    ...kitchenMonitorSettingsDefaults,
    columnCount: '4',
    tableGroupingEnabled: true,
    tableSortMode: 'oldest',
    targetMinutes: comparisonDefaults.targetMinutes,
    warningMinutes: comparisonDefaults.warningMinutes,
    orderTimeDisplayMode: comparisonDefaults.orderTimeDisplayMode,
  });
  draftDepartmentIds.value = departments.map((department) => department.id);
}

function save() {
  saveSettings({
    sortOrder: draft.sortOrder,
    lineHeight: draft.lineHeight,
    hideCompletedSeconds: Number(draft.hideCompletedSeconds),
    showCourseName: draft.showCourseName,
    showToppings: draft.showToppings,
    masterSoundEnabled: draft.masterSoundEnabled,
    newOrderSound: draft.newOrderSound,
    delayedOrderSound: draft.delayedOrderSound,
    cancelledOrderSound: draft.cancelledOrderSound,
  });
  saveDepartments(draftDepartmentIds.value);
  setColumnCountPreference(draft.columnCount);
  tableGroupingEnabled.value = draft.tableGroupingEnabled;
  sortMode.value = draft.tableSortMode;
  [
    'targetMinutes',
    'warningMinutes',
    'orderTimeDisplayMode',
  ].forEach((key) => comparison.setField(key, draft[key]));
  emit('close');
}

function selectAllDepartments() {
  draftDepartmentIds.value = departments.map((department) => department.id);
}

function clearAllDepartments() {
  draftDepartmentIds.value = [];
}

function executeDataClear() {
  clearOrderData();
  showClearConfirmation.value = false;
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  closeButtonRef.value?.focus();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="settings-hub-backdrop" role="presentation" @click.self="emit('close')">
    <section
      class="settings-hub"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-hub-title"
    >
      <header class="settings-hub-header">
        <div>
          <span>KITCHEN MONITOR</span>
          <h2 id="settings-hub-title">設定</h2>
          <p>この端末で使う表示・通知・操作の設定をまとめています</p>
        </div>
        <div class="settings-hub-status">
          <span>この端末</span>
          <strong>{{ ordersCleared ? '注文データなし' : 'モックデータ表示中' }}</strong>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          aria-label="設定を閉じる"
          title="閉じる"
          @click="emit('close')"
        >
          <X :size="22" :stroke-width="2.2" aria-hidden="true" />
        </button>
      </header>

      <div class="settings-hub-layout">
        <nav class="settings-hub-nav" aria-label="設定カテゴリ">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            :class="{ active: activeSection === section.id }"
            @click="activeSection = section.id"
          >
            <component :is="section.icon" :size="18" :stroke-width="2.1" aria-hidden="true" />
            <span>{{ section.label }}</span>
          </button>
          <div class="settings-hub-coverage">
            <span>設定網羅</span>
            <strong>現行 11 / 11</strong>
            <small>＋利用者設定</small>
          </div>
        </nav>

        <div class="settings-hub-content">
          <section v-if="activeSection === 'display'" class="settings-hub-section">
            <header>
              <span>DISPLAY</span>
              <h3>画面・表示</h3>
              <p>この端末で使うカードとリストの表示を変更します。</p>
            </header>

            <div class="settings-card-grid">
              <section class="settings-card">
                <div class="settings-card-title">
                  <div><strong>カード列数</strong><span>新UI</span></div>
                  <small>4列優先。幅が不足する場合は3列へ縮退</small>
                </div>
                <div class="settings-segmented" role="group" aria-label="カード列数">
                  <button
                    v-for="option in columnCountPreferenceOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: draft.columnCount === option.value }"
                    @click="draft.columnCount = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </section>

              <section class="settings-card">
                <div class="settings-card-title">
                  <div><strong>テーブルグループ</strong><span>新UI</span></div>
                  <small>テーブル別のカテゴリ区切り</small>
                </div>
                <label class="settings-switch-row">
                  <span>Waiterカテゴリでグループ表示</span>
                  <input v-model="draft.tableGroupingEnabled" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
                <label class="settings-select-row">
                  <span>初期並び順</span>
                  <select v-model="draft.tableSortMode">
                    <option value="oldest">最古注文順</option>
                    <option value="table">テーブル番号順</option>
                    <option value="latest">最終追加順</option>
                    <option value="manual">手動順</option>
                  </select>
                </label>
              </section>
            </div>

            <section class="settings-card settings-card-wide">
              <div class="settings-card-title">
                <div><strong>リスト型の注文表示</strong><span class="current">現行設定</span></div>
                <small>稼働中Kitchen Monitorと同じ設定項目</small>
              </div>
              <div class="settings-form-grid">
                <label class="settings-select-row">
                  <span>並び順</span>
                  <select v-model="draft.sortOrder">
                    <option value="oldest">注文が古い順</option>
                    <option value="newest">注文が新しい順</option>
                  </select>
                </label>
                <label class="settings-select-row">
                  <span>行間</span>
                  <select v-model="draft.lineHeight">
                    <option value="low">低</option>
                    <option value="medium">中（デフォルト）</option>
                    <option value="high">高</option>
                  </select>
                </label>
                <label class="settings-switch-row compact">
                  <span>コース名表示</span>
                  <input v-model="draft.showCourseName" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
                <label class="settings-switch-row compact">
                  <span>トッピング表示</span>
                  <input v-model="draft.showToppings" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
              </div>
            </section>
          </section>

          <section v-else-if="activeSection === 'targets'" class="settings-hub-section">
            <header>
              <span>TARGETS</span>
              <h3>表示対象</h3>
              <p>現行のWaiterカテゴリー設定を、調理部門として選びやすく整理しています。</p>
            </header>

            <div class="settings-target-tools">
              <label>
                <span aria-hidden="true">⌕</span>
                <input v-model="query" type="search" placeholder="部門名で検索" />
              </label>
              <button type="button" @click="selectAllDepartments">全選択</button>
              <button type="button" @click="clearAllDepartments">全解除</button>
              <strong>{{ draftDepartmentIds.length }}部門選択中</strong>
            </div>

            <div class="settings-target-grid">
              <label
                v-for="department in filteredDepartments"
                :key="department.id"
                :class="{ selected: draftDepartmentIds.includes(department.id) }"
              >
                <input v-model="draftDepartmentIds" type="checkbox" :value="department.id" />
                <span>{{ department.name }}</span>
                <small>{{ department.categoryIds.length ? `${department.categoryIds.length}カテゴリ` : '割当待ち' }}</small>
              </label>
            </div>
          </section>

          <section v-else-if="activeSection === 'notifications'" class="settings-hub-section">
            <header>
              <span>NOTIFICATIONS</span>
              <h3>通知・時間</h3>
              <p>通知音は種類別に設定し、重要な状態は色と文言でも表示します。</p>
            </header>

            <section class="settings-card settings-card-wide">
              <div class="settings-card-title">
                <div><strong>通知音</strong><span class="current">現行設定</span></div>
                <small>モックでは再生状態のみ保存し、実音は鳴りません</small>
              </div>
              <div class="settings-switch-list">
                <label class="settings-switch-row emphasized">
                  <span><b>通知音を一括で有効化</b><small>この端末のマスター設定</small></span>
                  <input v-model="draft.masterSoundEnabled" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
                <label class="settings-switch-row">
                  <span><b>新規オーダー通知</b><small>新しい注文を受信したとき</small></span>
                  <input v-model="draft.newOrderSound" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
                <label class="settings-switch-row">
                  <span><b>遅延アラート通知</b><small>設定時間を超過したとき</small></span>
                  <input v-model="draft.delayedOrderSound" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
                <label class="settings-switch-row">
                  <span><b>キャンセル通知</b><small>注文がキャンセルされたとき</small></span>
                  <input v-model="draft.cancelledOrderSound" type="checkbox" />
                  <i aria-hidden="true"></i>
                </label>
              </div>
            </section>

            <div class="settings-card-grid">
              <section class="settings-card">
                <div class="settings-card-title">
                  <div><strong>遅延アラート</strong><span class="current">現行設定</span></div>
                  <small>注文からの経過時間</small>
                </div>
                <label class="settings-select-row">
                  <span>超過とする時間</span>
                  <select v-model.number="draft.targetMinutes">
                    <option v-for="minute in comparisonOptions.targetMinutes" :key="minute" :value="minute">
                      {{ minute }}分
                    </option>
                  </select>
                </label>
              </section>
              <section class="settings-card">
                <div class="settings-card-title">
                  <div><strong>期限間近</strong><span>新UI</span></div>
                  <small>超過前のオレンジ表示</small>
                </div>
                <label class="settings-select-row">
                  <span>事前警告</span>
                  <select v-model.number="draft.warningMinutes">
                    <option v-for="minute in comparisonOptions.warningMinutes" :key="minute" :value="minute">
                      {{ minute ? `${minute}分前から` : 'なし（現行互換）' }}
                    </option>
                  </select>
                </label>
              </section>
              <section class="settings-card settings-card-wide settings-grid-full">
                <div class="settings-card-title">
                  <div><strong>注文・テーブルの時間表示</strong><span>新UI</span></div>
                  <small>注文ヘッダーとテーブル内注文には選択した時間だけを表示</small>
                </div>
                <label class="settings-select-row">
                  <span>表示方式</span>
                  <select v-model="draft.orderTimeDisplayMode">
                    <option
                      v-for="option in comparisonOrderTimeDisplayModeOptions"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </section>
            </div>
          </section>

          <section v-else-if="activeSection === 'operations'" class="settings-hub-section">
            <header>
              <span>OPERATIONS</span>
              <h3>完了動作</h3>
              <p>調理済みにした後の非表示時間と、取消できる猶予を変更します。</p>
            </header>

            <div class="settings-card-grid">
              <section class="settings-card settings-card-wide settings-grid-full">
                <div class="settings-card-title">
                  <div><strong>調理済後 取消可能時間</strong><span class="current">利用者設定</span></div>
                  <small>注文・商品・リストで共通。既定5秒</small>
                </div>
                <label class="settings-number-row">
                  <span>押下後</span>
                  <input v-model.number="draft.hideCompletedSeconds" type="number" min="1" max="100" />
                  <b>秒</b>
                </label>
                <p class="settings-field-note">設定時間未満は取消可能で、到達時に完了を確定して一覧から非表示にします。</p>
              </section>
            </div>

          </section>

          <section v-else class="settings-hub-section">
            <header>
              <span>DATA</span>
              <h3>データ</h3>
              <p>本体の注文データクリアを、固定データ用の安全な操作として再現しています。</p>
            </header>

            <section class="settings-card settings-card-wide settings-danger-card">
              <div class="settings-card-title">
                <div><strong>注文データを削除する</strong><span class="current">現行設定</span></div>
                <small>このモック内の固定注文だけが対象です</small>
              </div>
              <p>注文別・テーブル別・リスト型から注文を非表示にします。APIや本体データには接続していません。</p>
              <div v-if="!showClearConfirmation" class="settings-data-actions">
                <button
                  v-if="!ordersCleared"
                  class="danger"
                  type="button"
                  @click="showClearConfirmation = true"
                >
                  注文データを削除する
                </button>
                <button v-else type="button" @click="restoreMockOrderData">モック注文を再表示</button>
              </div>
              <div v-else class="settings-inline-confirm" role="alert">
                <strong>モックの注文をすべて非表示にしますか？</strong>
                <div>
                  <button type="button" @click="showClearConfirmation = false">戻る</button>
                  <button class="danger" type="button" @click="executeDataClear">削除する</button>
                </div>
              </div>
            </section>

            <section class="settings-card settings-card-wide">
              <div class="settings-card-title">
                <div><strong>設定値を初期状態に戻す</strong><span>モック補助</span></div>
                <small>保存前の入力値だけを初期値に戻します</small>
              </div>
              <button class="settings-reset-button" type="button" @click="resetDraft">
                <RotateCcw :size="17" :stroke-width="2.2" aria-hidden="true" />
                初期値を入力
              </button>
            </section>
          </section>
        </div>
      </div>

      <footer class="settings-hub-footer">
        <p><strong>固定モック</strong> API・他端末同期・実音再生は行いません</p>
        <div>
          <button type="button" @click="emit('close')">キャンセル</button>
          <button class="primary" type="button" @click="save">この内容で保存</button>
        </div>
      </footer>
    </section>
  </div>
</template>
