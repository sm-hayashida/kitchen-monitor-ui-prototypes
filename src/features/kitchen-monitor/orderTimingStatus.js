export const ORDER_TIME_TARGET_MINUTES = 15;
export const ORDER_TIME_WARNING_WINDOW_MINUTES = 3;

export function getOrderTimingStatus(
  elapsedMinutes,
  {
    targetMinutes = ORDER_TIME_TARGET_MINUTES,
    warningWindowMinutes = ORDER_TIME_WARNING_WINDOW_MINUTES,
  } = {},
) {
  const elapsed = Math.max(0, Number(elapsedMinutes) || 0);
  const target = Math.max(0, Number(targetMinutes) || 0);
  const warningWindow = Math.max(0, Number(warningWindowMinutes) || 0);
  const elapsedWholeMinutes = Math.floor(elapsed);
  const difference = elapsed - target;

  if (difference >= 0) {
    const overdueMinutes = Math.floor(difference);
    return {
      state: 'overdue',
      className: 'timing-overdue',
      contextLabel: `注文から${elapsedWholeMinutes}分`,
      label: overdueMinutes === 0 ? '期限到達' : `${overdueMinutes}分超過`,
      elapsedMinutes: elapsedWholeMinutes,
      overdueMinutes,
      remainingMinutes: 0,
      isOverdue: true,
      isWarning: false,
    };
  }

  const remainingMinutes = Math.ceil(Math.abs(difference));
  if (warningWindow > 0 && Math.abs(difference) <= warningWindow) {
    return {
      state: 'warning',
      className: 'timing-warning',
      contextLabel: `注文から${elapsedWholeMinutes}分`,
      label: `あと${remainingMinutes}分`,
      elapsedMinutes: elapsedWholeMinutes,
      overdueMinutes: 0,
      remainingMinutes,
      isOverdue: false,
      isWarning: true,
    };
  }

  return {
    state: 'normal',
    className: 'timing-normal',
    contextLabel: `注文から${elapsedWholeMinutes}分`,
    label: '',
    elapsedMinutes: elapsedWholeMinutes,
    overdueMinutes: 0,
    remainingMinutes,
    isOverdue: false,
    isWarning: false,
  };
}

export function getOrderTimeDisplay(timingStatus, mode = 'elapsed') {
  const elapsedMinutes = Math.max(0, Number(timingStatus?.elapsedMinutes) || 0);
  if (mode !== 'remaining') {
    return {
      label: `${elapsedMinutes}分経過`,
      ariaLabel: `注文から${elapsedMinutes}分経過`,
    };
  }

  const overdueMinutes = Math.max(0, Number(timingStatus?.overdueMinutes) || 0);
  if (timingStatus?.isOverdue) {
    return {
      label: overdueMinutes === 0 ? '期限到達' : `${overdueMinutes}分超過`,
      ariaLabel: overdueMinutes === 0
        ? `目標時間に到達、注文から${elapsedMinutes}分経過`
        : `目標時間を${overdueMinutes}分超過、注文から${elapsedMinutes}分経過`,
    };
  }

  const remainingMinutes = Math.max(0, Number(timingStatus?.remainingMinutes) || 0);
  return {
    label: `あと${remainingMinutes}分`,
    ariaLabel: `目標時間まであと${remainingMinutes}分、注文から${elapsedMinutes}分経過`,
  };
}

export function summarizeOrderTimings(orders, options = {}) {
  const statuses = orders.map((order) =>
    getOrderTimingStatus(order.ordered_elapsed_minutes, options),
  );
  const overdueCount = statuses.filter((status) => status.isOverdue).length;
  const warningCount = statuses.filter((status) => status.isWarning).length;

  if (overdueCount > 0) {
    return {
      state: 'overdue',
      className: 'timing-overdue',
      label: `超過${overdueCount}注文`,
      overdueCount,
      warningCount,
    };
  }

  if (warningCount > 0) {
    return {
      state: 'warning',
      className: 'timing-warning',
      label: `期限間近${warningCount}注文`,
      overdueCount,
      warningCount,
    };
  }

  return {
    state: 'normal',
    className: 'timing-normal',
    label: '',
    overdueCount,
    warningCount,
  };
}
