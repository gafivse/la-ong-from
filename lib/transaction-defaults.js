// Only reuse saved selections that still exist and are active in this database.
export function transactionDefaults(boot, last, date) {
  const saved = last && typeof last === "object" ? last : {};
  const farms = boot.farms.filter((r) => r.status === "ACTIVE");
  const farm =
    farms.find((r) => r.id === saved.farmId) ||
    (farms.length === 1 ? farms[0] : null);
  const type = ["INCOME", "EXPENSE"].includes(saved.type)
    ? saved.type
    : "EXPENSE";
  const category = boot.categories.find(
    (r) =>
      r.id === saved.categoryId && r.status === "ACTIVE" && r.type === type,
  );
  const plot = boot.plots.find(
    (r) =>
      r.id === saved.plotId && r.status === "ACTIVE" && r.farmId === farm?.id,
  );
  return {
    transactionDate: date,
    type,
    farmId: farm?.id || "",
    plotId: plot?.id || "",
    categoryId: category?.id || "",
  };
}
