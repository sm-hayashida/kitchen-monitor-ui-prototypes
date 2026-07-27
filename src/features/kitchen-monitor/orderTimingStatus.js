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
  const difference = elapsed - targetMinutes;

  if (difference >= 0) {
    return {
      state: 'overdue',
      className: 'timing-overdue',
      contextLabel: `注文から${elapsed}分`,
      label: `${difference}分超過`,
      elapsedMinutes: elapsed,
      overdueMinutes: difference,
      remainingMinutes: 0,
      isOverdue: true,
      isWarning: false,
    };
  }

  const remainingMinutes = Math.abs(difference);
  if (remainingMinutes <= warningWindowMinutes) {
    return {
      state: 'warning',
      className: 'timing-warning',
      contextLabel: `注文から${elapsed}分`,
      label: `あと${remainingMinutes}分`,
      elapsedMinutes: elapsed,
      overdueMinutes: 0,
      remainingMinutes,
      isOverdue: false,
      isWarning: true,
    };
  }

  return {
    state: 'normal',
    className: 'timing-normal',
    contextLabel: `注文から${elapsed}分`,
    label: '',
    elapsedMinutes: elapsed,
    overdueMinutes: 0,
    remainingMinutes,
    isOverdue: false,
    isWarning: false,
  };
}

export function summarizeOrderTimings(orders) {
  const statuses = orders.map((order) =>
    getOrderTimingStatus(order.ordered_elapsed_minutes),
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
