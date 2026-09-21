export function formatDateInput(value) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "";
}

export function parseDateInput(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return "";
  const iso = value.split("/").reverse().join("-");
  const date = new Date(iso);
  return Number(iso.slice(0, 4)) > 0 &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
