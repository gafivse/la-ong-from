export function totals(rows) {
  let income = 0,
    expense = 0;
  for (const r of rows) {
    const cents = Math.round(Number(r.amount) * 100);
    if (r.type === "INCOME") income += cents;
    else expense += cents;
  }
  return {
    income: income / 100,
    expense: expense / 100,
    profit: (income - expense) / 100,
    count: rows.length,
  };
}
export function monthly(rows, year) {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    ...totals(
      rows.filter(
        (r) =>
          new Date(r.transactionDate).getUTCFullYear() === year &&
          new Date(r.transactionDate).getUTCMonth() === i,
      ),
    ),
  }));
}
export function byPlot(rows, plots, endDate) {
  const result = plots.map((p) => {
    const history = (p.treeHistories || [])
      .filter((h) => new Date(h.startDate) <= endDate)
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const treeCount = history.length
      ? history[0].treeCount
      : p.treeHistories?.length
        ? 0
        : p.treeCount;
    const t = totals(rows.filter((r) => r.plotId === p.id));
    return {
      plotId: p.id,
      name: p.name,
      treeCount,
      ...t,
      incomePerTree: treeCount ? t.income / treeCount : null,
      expensePerTree: treeCount ? t.expense / treeCount : null,
      profitPerTree: treeCount ? t.profit / treeCount : null,
    };
  });
  if (rows.some((r) => !r.plotId))
    result.push({
      name: "ไม่ระบุแปลง",
      treeCount: 0,
      ...totals(rows.filter((r) => !r.plotId)),
      incomePerTree: null,
      expensePerTree: null,
      profitPerTree: null,
    });
  return result;
}
