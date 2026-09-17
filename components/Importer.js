"use client";
import { useState } from "react";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
const fields = {
  transactionDate: "วันที่",
  type: "ประเภท",
  farm: "สวน",
  plot: "แปลง",
  category: "หมวดหมู่",
  unitPrice: "ราคา/หน่วย",
  quantity: "จำนวน",
  unit: "หน่วย",
  amount: "จำนวนเงิน",
  description: "รายละเอียด",
  remark: "หมายเหตุ",
  referenceNo: "เลขที่เอกสาร",
};
function csvParse(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (quoted) throw new Error("รูปแบบ CSV ไม่ถูกต้อง");
  return rows;
}
export default function Importer({ boot, canWrite, onDone }) {
  const [raw, setRaw] = useState([]),
    [map, setMap] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fileName, setFileName] = useState("");
  async function read(file) {
    if (!file) return;
    setError("");
    setRaw([]);
    setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
      let rows;
      if (file.name.toLowerCase().endsWith(".csv"))
        rows = csvParse((await file.text()).replace(/^\uFEFF/, ""));
      else if (file.name.toLowerCase().endsWith(".xlsx")) {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        if (!ws) throw new Error("ไม่พบชีต");
        rows = [];
        ws.eachRow((row) => {
          rows.push(
            Array.from({ length: ws.columnCount }, (_, i) => {
              const value = row.getCell(i + 1).value;
              if (value instanceof Date)
                return value.toISOString().slice(0, 10);
              if (value && typeof value === "object")
                return value.result ?? value.text ?? "";
              return value ?? "";
            }),
          );
        });
      } else throw new Error("รองรับเฉพาะ .xlsx และ .csv");
      if (rows.length < 2 || rows.length > 1001)
        throw new Error("ต้องมีข้อมูล 1–1,000 แถวและแถวหัวตาราง");
      const headers = rows[0].map(String);
      setRaw([headers, ...rows.slice(1)]);
      setMap(
        Object.fromEntries(
          Object.entries(fields).map(([key, label]) => [
            key,
            headers.findIndex((h) => h.trim() === label || h.trim() === key),
          ]),
        ),
      );
      setFileName(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const preview = raw.slice(1).map((r, i) => {
    const get = (k) => (map[k] >= 0 ? String(r[map[k]] ?? "").trim() : "");
    const farm = boot.farms.find(
      (x) => x.name === get("farm") && x.status === "ACTIVE",
    );
    const plot = get("plot")
      ? boot.plots.find(
          (x) =>
            x.name === get("plot") &&
            x.farmId === farm?.id &&
            x.status === "ACTIVE",
        )
      : null;
    const type = ["รายรับ", "INCOME"].includes(get("type"))
      ? "INCOME"
      : ["รายจ่าย", "EXPENSE"].includes(get("type"))
        ? "EXPENSE"
        : null;
    const category = boot.categories.find(
      (x) =>
        x.name === get("category") && x.type === type && x.status === "ACTIVE",
    );
    const unit = get("unit")
      ? boot.units.find((x) => x.name === get("unit") && x.status === "ACTIVE")
      : null;
    let date = get("transactionDate");
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
      let [d, m, y] = date.split("/").map(Number);
      if (y > 2400) y -= 543;
      date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    const amount = Number(get("amount").replaceAll(",", ""));
    const issues = [];
    if (!farm) issues.push("ไม่พบสวน");
    if (get("plot") && !plot) issues.push("ไม่พบแปลงในสวน");
    if (!category) issues.push("หมวดหมู่/ประเภทไม่ตรง");
    if (get("unit") && !unit) issues.push("ไม่พบหน่วย");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      (!Number.isNaN(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      issues.push("วันที่ไม่ถูกต้อง");
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 999999999999 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.001
    )
      issues.push("จำนวนเงินไม่ถูกต้อง");
    for (const k of ["quantity", "unitPrice"])
      if (
        get(k) &&
        (!Number.isFinite(Number(get(k).replaceAll(",", ""))) ||
          Number(get(k).replaceAll(",", "")) < 0)
      )
        issues.push(fields[k] + "ไม่ถูกต้อง");
    return {
      row: i + 2,
      issues,
      label: `${get("farm")} / ${get("category")}`,
      data: {
        transactionDate: date,
        type,
        farmId: farm?.id,
        plotId: plot?.id || null,
        categoryId: category?.id,
        unitId: unit?.id || null,
        amount,
        unitPrice: get("unitPrice")
          ? Number(get("unitPrice").replaceAll(",", ""))
          : null,
        quantity: get("quantity")
          ? Number(get("quantity").replaceAll(",", ""))
          : null,
        description: get("description"),
        remark: get("remark"),
        referenceNo: get("referenceNo"),
      },
    };
  });
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.map((p) => p.data) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setRaw([]);
      await onDone(result.count);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function template() {
    const blob = new Blob(
      ["\uFEFF" + Object.values(fields).join(",") + "\r\n"],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "farm-import-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <section className="panel import-panel">
      <div className="panel-heading">
        <div>
          <h2>นำเข้าจาก Excel / CSV</h2>
          <p>เลือกไฟล์ → จับคู่คอลัมน์ → ตรวจสอบ → นำเข้า</p>
        </div>
        <button className="button secondary" onClick={template}>
          <Download size={16} />
          ไฟล์ต้นแบบ
        </button>
      </div>
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <label className="upload-area">
        <FileSpreadsheet size={44} />
        <b>{busy ? "กำลังประมวลผล…" : fileName || "เลือกไฟล์บัญชีสวน"}</b>
        <span>.xlsx หรือ .csv · สูงสุด 5 MB / 1,000 รายการ</span>
        <input
          aria-label="เลือกไฟล์นำเข้า"
          type="file"
          accept=".xlsx,.csv"
          disabled={busy || !canWrite}
          onChange={(e) => read(e.target.files[0])}
        />
      </label>
      <p className="report-note">
        สร้างสวน แปลง และหมวดหมู่ให้ชื่อตรงกับไฟล์ก่อนนำเข้า · วันที่ใช้
        YYYY-MM-DD หรือ วัน/เดือน/ปี · ข้อมูลซ้ำจะถูกเพิ่มเป็นรายการใหม่
      </p>
      {raw.length > 0 && (
        <>
          <h3>จับคู่คอลัมน์</h3>
          <div className="mapping-grid">
            {Object.entries(fields).map(([k, label]) => (
              <label className="field" key={k}>
                <span>{label}</span>
                <select
                  value={map[k] ?? -1}
                  onChange={(e) =>
                    setMap((p) => ({ ...p, [k]: Number(e.target.value) }))
                  }
                >
                  <option value={-1}>ไม่ใช้คอลัมน์</option>
                  {raw[0].map((h, i) => (
                    <option value={i} key={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <h3>
            ตรวจสอบ {preview.length} รายการ · ผิดพลาด{" "}
            {preview.filter((p) => p.issues.length).length} รายการ
          </h3>
          <div className="table-scroll import-preview">
            <table>
              <thead>
                <tr>
                  <th>แถว</th>
                  <th>วันที่</th>
                  <th>รายการ</th>
                  <th>จำนวนเงิน</th>
                  <th>ผลตรวจสอบ</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.row}>
                    <td>{p.row}</td>
                    <td>{p.data.transactionDate}</td>
                    <td>{p.label}</td>
                    <td>{p.data.amount}</td>
                    <td className={p.issues.length ? "expense" : "income"}>
                      {p.issues.join(", ") || "พร้อมนำเข้า"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="button primary"
            disabled={
              busy ||
              !canWrite ||
              !preview.length ||
              preview.some((p) => p.issues.length)
            }
            onClick={submit}
          >
            <Upload size={17} />
            {busy ? "กำลังนำเข้า…" : `ยืนยันนำเข้า ${preview.length} รายการ`}
          </button>
        </>
      )}
    </section>
  );
}
