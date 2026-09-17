"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { transactionDefaults } from "../lib/transaction-defaults";
import ProfileMenu from "./ProfileMenu";
import {
  Sprout,
  LayoutDashboard,
  ArrowLeftRight,
  Trees,
  Map,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Download,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ReceiptText,
  ChevronRight,
  Pencil,
  Trash2,
  Search,
  Upload,
  Leaf,
  SlidersHorizontal,
} from "lucide-react";
const Charts = dynamic(() => import("../components/Charts"), {
  ssr: false,
  loading: () => <div className="chart-loading">กำลังโหลดกราฟ…</div>,
});
const Importer = dynamic(() => import("../components/Importer"), {
  loading: () => <p>กำลังโหลดเครื่องมือนำเข้า…</p>,
});
const PlotChart = dynamic(() => import("../components/PlotChart"), {
  ssr: false,
});
const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const months = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const names = {
  dashboard: "ภาพรวมบัญชี",
  transactions: "รายรับ–รายจ่าย",
  farms: "ข้อมูลสวน",
  plots: "ข้อมูลแปลง",
  reports: "รายงานและวิเคราะห์",
  settings: "ตั้งค่า",
  import: "นำเข้าข้อมูล",
};
const masterNames = {
  farms: "สวน",
  plots: "แปลง",
  categories: "หมวดหมู่",
  "crop-types": "ประเภทพืช",
  units: "หน่วย",
  users: "ผู้ใช้งาน",
};
const reportNames = {
  monthly: "สรุปรายเดือน",
  "monthly-by-plot": "รายเดือนแยกตามแปลง",
  yearly: "สรุปรายปี / เปรียบเทียบหลายปี",
  "yearly-by-plot": "รายปีแยกแปลง / ต้นทุนต่อต้น",
};
async function api(path, options = {}) {
  const response = await fetch("/api/" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || "เกิดข้อผิดพลาด"), {
      status: response.status,
    });
  return data;
}
function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
function Select({
  label,
  options,
  value,
  onChange,
  empty = "ทั้งหมด",
  required = false,
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.id ?? o.value} value={o.id ?? o.value}>
            {o.name ?? o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function App() {
  const router = useRouter();
  const pathname = usePathname();
  const [, page = "dashboard", view] = pathname.split("/");
  const report = page === "reports" ? view || "monthly" : "monthly";
  const setting = page === "settings" ? view || "categories" : "categories";
  const setReport = (value) => router.push("/reports/" + value);
  const setSetting = (value) => router.push("/settings/" + value);
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(null),
    [loading, setLoading] = useState(true),
    [sidebar, setSidebar] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      farmId: "",
      plotId: "",
      cropTypeId: "",
      type: "",
      categoryId: "",
      search: "",
    }),
    [filterOpen, setFilterOpen] = useState(false),
    [data, setData] = useState(null),
    [listPage, setListPage] = useState(1);
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== "" && v != null),
  ).toString();
  const resource = page === "settings" ? setting : page;
  const canWrite = user?.role !== "VIEWER",
    canManage = ["OWNER", "ADMIN"].includes(user?.role);
  const loadBoot = useCallback(async () => {
    const b = await api("bootstrap");
    setBoot(b);
    setUser(b.user);
    return b;
  }, []);
  useEffect(() => {
    loadBoot()
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [loadBoot]);
  useEffect(() => {
    if (loading) return;
    if (!user && page !== "login") router.replace("/login");
    if (user && page === "login") router.replace("/dashboard");
  }, [loading, user, page, router]);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("auth/logout", { method: "POST" });
      ++requestSequence.current;
      setUser(null);
      setBoot(null);
      setModal(null);
      setSidebar(false);
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const requestSequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!user) return;
    const seq = ++requestSequence.current;
    setBusy(true);
    setError("");
    try {
      let result;
      if (page === "dashboard")
        result = await api("dashboard/summary?" + query);
      else if (page === "transactions")
        result = await api("transactions?" + query + "&page=" + listPage);
      else if (page === "reports")
        result = await api("reports/" + report + "?" + query);
      else if (resource === "users") result = await api("users");
      else result = null;
      if (seq === requestSequence.current) setData(result);
    } catch (e) {
      if (seq === requestSequence.current) {
        setError(e.message);
        if (e.status === 401) setUser(null);
      }
    } finally {
      if (seq === requestSequence.current) setBusy(false);
    }
  }, [user, page, query, listPage, report, resource]);
  useEffect(() => {
    setData(null);
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  function navigate(p) {
    router.push("/" + p);
    setSidebar(false);
    setData(null);
    setError("");
  }
  function filter(key, value) {
    setListPage(1);
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "farmId" ? { plotId: "" } : {}),
      ...(key === "type" ? { categoryId: "" } : {}),
    }));
  }
  function addTransaction() {
    setError("");
    if (!boot.farms.some((f) => f.status === "ACTIVE")) {
      setError(
        canManage
          ? "กรุณาเพิ่มสวนที่ใช้งานก่อนบันทึกรายการ"
          : "กรุณาให้ผู้ดูแลเพิ่มสวนที่ใช้งานก่อนบันทึกรายการ",
      );
      if (canManage) setModal({ resource: "farms", record: {} });
      return;
    }
    let last = {};
    try {
      last = JSON.parse(localStorage.getItem("farm-last-v1") || "{}");
    } catch {}
    setModal({
      resource: "transactions",
      record: transactionDefaults(boot, last, today()),
    });
  }
  async function save(values) {
    setBusy(true);
    setError("");
    try {
      await api(
        modal.resource + (modal.record?.id ? "/" + modal.record.id : ""),
        {
          method: modal.record?.id ? "PUT" : "POST",
          body: JSON.stringify(values),
        },
      );
      if (modal.resource === "transactions") {
        try {
          localStorage.setItem(
            "farm-last-v1",
            JSON.stringify({
              transactionDate: values.transactionDate,
              type: values.type,
              farmId: values.farmId,
              plotId: values.plotId,
              categoryId: values.categoryId,
            }),
          );
        } catch {}
        const [year, month] = values.transactionDate.split("-").map(Number);
        setListPage(1);
        setFilters({
          year,
          month,
          farmId: "",
          plotId: "",
          cropTypeId: "",
          type: "",
          categoryId: "",
          search: "",
        });
      }
      setModal(null);
      setNotice("บันทึกข้อมูลเรียบร้อยแล้ว");
      await loadBoot();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(r, row) {
    if (
      !confirm(
        `ต้องการลบ ${row.name || row.description || "รายการนี้"} ใช่หรือไม่?`,
      )
    )
      return;
    try {
      await api(r + "/" + row.id, { method: "DELETE" });
      setNotice("ลบข้อมูลแล้ว");
      await loadBoot();
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  if (loading || (!user && page !== "login") || (user && page === "login"))
    return (
      <div className="loading">
        <Sprout size={42} />
        <p>กำลังเปิดบัญชีสวน…</p>
      </div>
    );
  if (!user)
    return (
      <Login
        error={error}
        onLogin={async (values) => {
          setError("");
          try {
            await api("auth/login", {
              method: "POST",
              body: JSON.stringify(values),
            });
            await loadBoot();
          } catch (e) {
            setError(e.message);
          }
        }}
      />
    );
  const masterRows =
    resource === "users"
      ? Array.isArray(data)
        ? data
        : []
      : boot?.[resource === "crop-types" ? "cropTypes" : resource] || [];
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="ปิดเมนู"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={"sidebar " + (sidebar ? "open" : "")}>
        <a
          className="brand"
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-symbol">
            <Sprout />
          </span>
          <span>
            บัญชีสวน<small>LA-ONG FARM</small>
          </span>
        </a>
        <div className="workspace">
          <div>
            พื้นที่จัดการสวน<small>ทุกสวนของคุณในที่เดียว</small>
          </div>
        </div>
        <p className="nav-label">จัดการบัญชี</p>
        <nav>
          {[
            ["dashboard", LayoutDashboard],
            ["transactions", ArrowLeftRight],
            ["import", Upload],
          ].map(([p, Icon]) => (
            <Link
              key={p}
              href={"/" + p}
              className={page === p ? "active" : ""}
              aria-current={page === p ? "page" : undefined}
              onClick={() => setSidebar(false)}
            >
              <Icon size={20} />
              <span>{names[p]}</span>
              {page === p && <i />}
            </Link>
          ))}
          <p className="nav-label">สวนและข้อมูล</p>
          {[
            ["farms", Trees],
            ["plots", Map],
            ["reports", ChartNoAxesCombined],
            ["settings", Settings],
          ].map(([p, Icon]) => (
            <Link
              key={p}
              href={"/" + p}
              className={page === p ? "active" : ""}
              aria-current={page === p ? "page" : undefined}
              onClick={() => setSidebar(false)}
            >
              <Icon size={20} />
              <span>{names[p]}</span>
              {page === p && <i />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-tip">
          <Leaf size={23} />
          <strong>รู้ต้นทุน เห็นกำไร</strong>
          <p>
            บันทึกทุกการเติบโต
            <br />
            เพื่ออนาคตที่ดีของสวนคุณ
          </p>
        </div>
        <div className="user-block">
          <span className="avatar">{user.name?.slice(0, 1) || "F"}</span>
          <div>
            {user.name}
            <small>{user.role}</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="เปิดเมนู"
              onClick={() => setSidebar(true)}
            >
              <Menu />
            </button>
            <span>พื้นที่ทำงาน</span>
            <ChevronRight size={14} />
            <b>{names[page]}</b>
          </div>
          <div className="topbar-right">
            <ProfileMenu user={user} busy={busy} onLogout={logout} />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">FARM MANAGEMENT</div>
              <h1>{names[page]}</h1>
              <p>
                {page === "dashboard"
                  ? "ดูแลทุกตัวเลข เพื่อให้สวนของคุณเติบโตอย่างมั่นใจ"
                  : page === "transactions"
                    ? "บันทึกและติดตามทุกความเคลื่อนไหวของบัญชีสวน"
                    : page === "reports"
                      ? "เปลี่ยนข้อมูลบัญชีให้เป็นแนวทางดูแลสวน"
                      : page === "import"
                        ? "นำข้อมูลเดิมมาต่อยอดในบัญชีสวน"
                        : "จัดการข้อมูลพื้นฐานให้พร้อมสำหรับการทำสวน"}
              </p>
            </div>
            <div className="actions">
              {["dashboard", "transactions", "reports"].includes(page) && (
                <a
                  className="button secondary"
                  href={
                    "/api/export?" +
                    query +
                    (page === "reports" ? "&report=" + report : "")
                  }
                >
                  <Download size={17} />
                  ส่งออก Excel
                </a>
              )}
              {canWrite && ["dashboard", "transactions"].includes(page) && (
                <button className="button primary" onClick={addTransaction}>
                  <Plus size={18} />
                  เพิ่มรายการ
                </button>
              )}
              {canManage && ["farms", "plots", "settings"].includes(page) && (
                <button
                  className="button primary"
                  onClick={() => setModal({ resource, record: {} })}
                >
                  <Plus size={18} />
                  เพิ่ม{masterNames[resource]}
                </button>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button aria-label="ปิดข้อความ" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
            </div>
          )}
          {["dashboard", "transactions", "reports"].includes(page) && (
            <>
              <button
                className="button secondary mobile-filter"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <SlidersHorizontal size={16} />
                ตัวกรองข้อมูล
              </button>
              <section className={"filters " + (filterOpen ? "show" : "")}>
                <Select
                  label="ปี (ค.ศ.)"
                  value={filters.year}
                  onChange={(v) => filter("year", v)}
                  empty="เลือกปี"
                  options={Array.from({ length: 21 }, (_, i) => ({
                    value: new Date().getFullYear() + 1 - i,
                    label: `${new Date().getFullYear() + 1 - i} / ${new Date().getFullYear() + 544 - i}`,
                  }))}
                />
                <Select
                  label="เดือน"
                  value={filters.month}
                  onChange={(v) => filter("month", v)}
                  empty={
                    page === "dashboard" ? "ทั้งปี (ทุกเดือน)" : "ทุกเดือน"
                  }
                  options={months.map((name, i) => ({ id: i + 1, name }))}
                />
                <Select
                  label="สวน"
                  value={filters.farmId}
                  onChange={(v) => filter("farmId", v)}
                  options={boot.farms}
                />
                <Select
                  label="แปลง"
                  value={filters.plotId}
                  onChange={(v) => filter("plotId", v)}
                  options={boot.plots.filter(
                    (p) => !filters.farmId || p.farmId === filters.farmId,
                  )}
                />
                <details className="extra-filters">
                  <summary>
                    <SlidersHorizontal size={17} /> เพิ่มเติม
                  </summary>
                  <div>
                    <Select
                      label="ประเภทพืช"
                      value={filters.cropTypeId}
                      onChange={(v) => filter("cropTypeId", v)}
                      options={boot.cropTypes}
                    />
                    <Select
                      label="ประเภทรายการ"
                      value={filters.type}
                      onChange={(v) => filter("type", v)}
                      options={[
                        { id: "INCOME", name: "รายรับ" },
                        { id: "EXPENSE", name: "รายจ่าย" },
                      ]}
                    />
                    <Select
                      label="หมวดหมู่"
                      value={filters.categoryId}
                      onChange={(v) => filter("categoryId", v)}
                      options={boot.categories.filter(
                        (c) => !filters.type || c.type === filters.type,
                      )}
                    />
                  </div>
                </details>
              </section>
            </>
          )}
          {busy && !modal && (
            <div className="progress" aria-label="กำลังโหลด" />
          )}
          {page === "dashboard" && data?.monthly && (
            <>
              <div className="section-title">
                <h2>
                  สรุป
                  {Number(filters.month)
                    ? months[Number(filters.month) - 1]
                    : "ทั้งปี"}{" "}
                  {Number(filters.year) + 543}
                </h2>
                <span className="muted">หน่วย: บาท</span>
              </div>
              <div className="stats-grid">
                {[
                  [
                    "รายรับ",
                    data.summary.income,
                    ArrowDownRight,
                    "income",
                    Number(filters.month)
                      ? "รายรับทั้งหมดของเดือน"
                      : "รายรับทั้งหมดของปี",
                  ],
                  [
                    "รายจ่าย",
                    data.summary.expense,
                    ArrowUpRight,
                    "expense",
                    Number(filters.month)
                      ? "ค่าใช้จ่ายทั้งหมดของเดือน"
                      : "ค่าใช้จ่ายทั้งหมดของปี",
                  ],
                  [
                    "กำไร / ขาดทุนสุทธิ",
                    data.summary.profit,
                    Wallet,
                    data.summary.profit < 0 ? "expense" : "profit",
                    "รายรับ หัก รายจ่าย",
                  ],
                  [
                    "จำนวนรายการ",
                    data.summary.count,
                    ReceiptText,
                    "neutral",
                    Number(filters.month)
                      ? "รายการที่บันทึกในเดือนนี้"
                      : "รายการที่บันทึกในปีนี้",
                  ],
                ].map(([label, value, Icon, color, caption]) => (
                  <div className={"stat-card " + color} key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className="stat-icon">
                        <Icon size={21} />
                      </span>
                    </div>
                    <strong>
                      {color === "neutral"
                        ? value.toLocaleString()
                        : money(value)}
                      <small>{color === "neutral" ? "รายการ" : "฿"}</small>
                    </strong>
                    <p>{caption}</p>
                  </div>
                ))}
              </div>
              <Charts
                monthly={data.monthly}
                expenses={data.expenses}
                plots={data.plots}
                periodLabel={
                  Number(filters.month) ? "เดือนที่เลือก" : "ปีที่เลือก"
                }
              />
              <div className="dashboard-bottom">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>รายการล่าสุด</h2>
                      <p>
                        ความเคลื่อนไหวบัญชีใน
                        {Number(filters.month) ? "เดือนที่เลือก" : "ปีที่เลือก"}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("transactions")}
                    >
                      ดูทั้งหมด <ChevronRight size={15} />
                    </button>
                  </div>
                  <TransactionTable
                    rows={data.recent}
                    onEdit={(r) =>
                      setModal({ resource: "transactions", record: r })
                    }
                    canWrite={canWrite}
                  />
                </section>
                <section className="year-card">
                  <span className="year-icon">
                    <Sprout size={27} />
                  </span>
                  <p>ภาพรวมตลอดปี {Number(filters.year) + 543}</p>
                  <h2>เติบโตไปด้วยกัน</h2>
                  <div>
                    <span>รายรับรวม</span>
                    <b>฿ {money(data.year.income)}</b>
                  </div>
                  <div>
                    <span>รายจ่ายรวม</span>
                    <b>฿ {money(data.year.expense)}</b>
                  </div>
                  <div className="year-profit">
                    <span>กำไร / ขาดทุนสุทธิ</span>
                    <b>฿ {money(data.year.profit)}</b>
                  </div>
                  <small>คำนวณจากตัวกรองสวนและหมวดหมู่ที่เลือก</small>
                </section>
              </div>
              <section className="panel mt">
                <div className="panel-heading">
                  <h2>ผลประกอบการแยกตามแปลง</h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      setReport("yearly-by-plot");
                      setSidebar(false);
                    }}
                  >
                    ดูรายรับ ต้นทุน และกำไรต่อต้น <ChevronRight size={16} />
                  </button>
                </div>
                <div className="plot-overview">
                  {boot.plots.length ? (
                    boot.plots.map((p) => (
                      <div key={p.id}>
                        <span className="plot-icon">
                          <Trees />
                        </span>
                        <div>
                          <b>{p.name}</b>
                          <p>
                            {p.farm.name} · {p.treeCount.toLocaleString()} ต้น
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty text="เริ่มต้นด้วยการเพิ่มสวนและแปลงของคุณ" />
                  )}
                </div>
              </section>
            </>
          )}
          {page === "dashboard" && data?.plots && (
            <PlotChart
              plots={data.plots}
              periodLabel={
                Number(filters.month) ? "เดือนที่เลือก" : "ปีที่เลือก"
              }
            />
          )}
          {page === "transactions" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    รายการบัญชีทั้งหมด{" "}
                    <span className="count">{data?.count || 0}</span>
                  </h2>
                  <p>
                    รายรับ ฿ {money(data?.summary?.income || 0)} · รายจ่าย ฿{" "}
                    {money(data?.summary?.expense || 0)}
                  </p>
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="ค้นหารายการ"
                    placeholder="ค้นหารายละเอียด / เลขที่เอกสาร"
                    value={filters.search}
                    onChange={(e) => filter("search", e.target.value)}
                  />
                </label>
              </div>
              <TransactionTable
                rows={data?.rows || []}
                canWrite={canWrite}
                onEdit={(r) =>
                  setModal({ resource: "transactions", record: r })
                }
                onDelete={(r) => remove("transactions", r)}
              />
              <div className="pagination">
                <span>{data?.count || 0} รายการ · หน้าละ 30 รายการ</span>
                <button
                  disabled={listPage === 1}
                  onClick={() => setListPage((p) => p - 1)}
                >
                  ก่อนหน้า
                </button>
                <b>{listPage}</b>
                <button
                  disabled={listPage * 30 >= (data?.count || 0)}
                  onClick={() => setListPage((p) => p + 1)}
                >
                  ถัดไป
                </button>
              </div>
            </section>
          )}
          {page === "reports" && (
            <>
              <div className="tabs">
                {Object.entries(reportNames).map(([key, label]) => (
                  <button
                    className={key === report ? "active" : ""}
                    key={key}
                    onClick={() => {
                      setReport(key);
                      setData(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="report-note">
                {report.startsWith("monthly")
                  ? "รายงานรายเดือนแสดงครบ 12 เดือนของปีที่เลือก"
                  : report === "yearly"
                    ? "เปรียบเทียบทุกปีที่มีข้อมูล โดยใช้ตัวกรองสวน แปลง และหมวดหมู่"
                    : "จำนวนต้นอ้างอิงประวัติล่าสุด ณ สิ้นเดือนที่เลือก หรือสิ้นปีเมื่อเลือกทุกเดือน"}{" "}
                · — หมายถึงไม่มีจำนวนต้นสำหรับคำนวณ
              </p>
              {Array.isArray(data) && (
                <ReportTable data={data} report={report} />
              )}
            </>
          )}
          {["farms", "plots", "settings"].includes(page) && (
            <>
              {page === "settings" && (
                <div className="tabs">
                  {[
                    "categories",
                    "crop-types",
                    "units",
                    ...(canManage ? ["users"] : []),
                  ].map((r) => (
                    <button
                      key={r}
                      className={setting === r ? "active" : ""}
                      onClick={() => {
                        setSetting(r);
                        setData(null);
                      }}
                    >
                      {masterNames[r]}
                    </button>
                  ))}
                </div>
              )}
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    {masterNames[resource]}ทั้งหมด{" "}
                    <span className="count">{masterRows.length}</span>
                  </h2>
                  <span className="muted">
                    {resource === "users"
                      ? "ผู้ใช้งานร่วมกันในพื้นที่บัญชีสวนนี้"
                      : "เพิ่ม แก้ไข หรือปิดใช้งานข้อมูล"}
                  </span>
                </div>
                {masterRows.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ชื่อ</th>
                          <th>
                            {resource === "plots"
                              ? "สวน / จำนวนต้น"
                              : resource === "users"
                                ? "อีเมล"
                                : "รหัส / ประเภท"}
                          </th>
                          <th>{resource === "users" ? "สิทธิ์" : "สถานะ"}</th>
                          {canManage && <th>จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {masterRows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <b>{row.name}</b>
                              {resource === "plots" && (
                                <small>
                                  {row.area || "—"} {row.areaUnit || "ไร่"}
                                </small>
                              )}
                            </td>
                            <td>
                              {resource === "plots"
                                ? `${row.farm?.name} · ${row.treeCount} ต้น`
                                : resource === "users"
                                  ? row.email
                                  : row.code ||
                                    boot.cropTypes.find(
                                      (c) => c.id === row.cropTypeId,
                                    )?.name ||
                                    "—"}
                              {row.type && (
                                <small>
                                  {row.type === "INCOME" ? "รายรับ" : "รายจ่าย"}
                                </small>
                              )}
                            </td>
                            <td>
                              <span
                                className={
                                  "badge " +
                                  (row.status === "INACTIVE"
                                    ? "inactive"
                                    : "income")
                                }
                              >
                                {row.role ||
                                  (row.status === "ACTIVE"
                                    ? "ใช้งาน"
                                    : "ปิดใช้งาน")}
                              </span>
                            </td>
                            {canManage && (
                              <td>
                                <div className="row-actions">
                                  <button
                                    aria-label={"แก้ไข " + row.name}
                                    onClick={() =>
                                      setModal({ resource, record: row })
                                    }
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    aria-label={"ลบ " + row.name}
                                    onClick={() => remove(resource, row)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty text={`ยังไม่มีข้อมูล${masterNames[resource]}`} />
                )}
              </section>
            </>
          )}
          {page === "import" && (
            <Importer
              boot={boot}
              canWrite={canWrite}
              onDone={async (count) => {
                setNotice(`นำเข้า ${count} รายการเรียบร้อยแล้ว`);
                await loadBoot();
              }}
            />
          )}
          <footer>
            <span>
              <Sprout size={14} /> บัญชีสวน · บันทึกวันนี้ วางแผนวันข้างหน้า
            </span>
            <span>Farm Ledger 1.0</span>
          </footer>
        </main>
      </div>
      {canWrite && (
        <button
          className="fab"
          aria-label="เพิ่มรายการ"
          onClick={addTransaction}
        >
          <Plus size={26} />
        </button>
      )}
      {modal && (
        <Editor
          key={modal.resource + (modal.record?.id || "new")}
          modal={modal}
          boot={boot}
          busy={busy}
          error={error}
          onClose={() => {
            setModal(null);
            setError("");
          }}
          onSave={save}
        />
      )}
    </div>
  );
}
function Empty({ text = "ยังไม่มีรายการในช่วงเวลานี้" }) {
  return (
    <div className="empty">
      <ReceiptText size={32} />
      <b>{text}</b>
      <p>ข้อมูลที่บันทึกจะแสดงที่นี่</p>
    </div>
  );
}
function Login({ onLogin, error }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-story">
        <span className="brand-symbol">
          <Sprout size={35} />
        </span>
        <span className="eyebrow">FARM LEDGER</span>
        <h1>
          ทุกการเติบโต
          <br />
          เริ่มจากการดูแล
        </h1>
        <p>
          จัดการรายรับ รายจ่าย และเห็นกำไรของสวน
          <br />
          ในพื้นที่เดียวที่เข้าใจง่าย
        </p>
        <div className="login-art">
          <Trees size={150} strokeWidth={1} />
          <Sprout size={95} strokeWidth={1} />
        </div>
        <small>บัญชีสวน · คู่คิดของคนทำสวน</small>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onLogin(Object.fromEntries(new FormData(e.currentTarget)));
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">ยินดีต้อนรับกลับ</span>
        <h2>เข้าสู่บัญชีสวน</h2>
        <p>ดูแลสวนของคุณ เริ่มต้นได้ที่นี่</p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <Field
          label="อีเมล"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          required
        />
        <Field
          label="รหัสผ่าน"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button className="button primary" disabled={busy}>
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          <ArrowUpRight size={18} />
        </button>
        <small>ติดต่อเจ้าของสวนเพื่อขอบัญชีเข้าใช้งาน</small>
      </form>
    </div>
  );
}
function TransactionTable({ rows, canWrite, onEdit, onDelete }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="table-scroll transactions-table">
      <table>
        <thead>
          <tr>
            <th>วันที่ / รายการ</th>
            <th>สวน / แปลง</th>
            <th>ประเภท</th>
            <th className="right">จำนวนเงิน (บาท)</th>
            {canWrite && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="transaction-name">
                  <span
                    className={
                      "transaction-icon " +
                      (r.type === "INCOME" ? "income" : "expense")
                    }
                  >
                    {r.type === "INCOME" ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <div>
                    <b>{r.category?.name}</b>
                    <small>
                      {new Date(r.transactionDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}{" "}
                      {r.description && "· " + r.description}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {r.farm?.name}
                <small>{r.plot?.name || "ไม่ระบุแปลง"}</small>
              </td>
              <td>
                <span
                  className={
                    "badge " + (r.type === "INCOME" ? "income" : "expense")
                  }
                >
                  {r.type === "INCOME" ? "รายรับ" : "รายจ่าย"}
                </span>
              </td>
              <td
                className={
                  "right amount " + (r.type === "INCOME" ? "income" : "expense")
                }
              >
                {r.type === "INCOME" ? "+" : "−"}
                {money(r.amount)}
              </td>
              {canWrite && (
                <td>
                  <div className="row-actions">
                    <button aria-label="แก้ไขรายการ" onClick={() => onEdit(r)}>
                      <Pencil size={15} />
                    </button>
                    {onDelete && (
                      <button aria-label="ลบรายการ" onClick={() => onDelete(r)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ReportTable({ data, report }) {
  const plot = report.includes("plot");
  const rows =
    report === "monthly-by-plot"
      ? data.flatMap((r) => r.plots.map((p) => ({ ...p, month: r.month })))
      : data;
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{reportNames[report]}</h2>
        <span className="muted">หน่วย: บาท</span>
      </div>
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  {report === "yearly"
                    ? "ปี"
                    : report === "yearly-by-plot"
                      ? "แปลง"
                      : "เดือน"}
                </th>
                {report === "monthly-by-plot" && <th>แปลง</th>}
                {plot && <th>จำนวนต้น</th>}
                {[
                  "รายรับ",
                  "รายจ่าย",
                  "กำไร / ขาดทุน",
                  ...(plot ? ["รายรับ/ต้น", "รายจ่าย/ต้น", "กำไร/ต้น"] : []),
                ].map((s) => (
                  <th key={s} className="right">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <b>
                      {r.month
                        ? months[r.month - 1]
                        : r.year
                          ? r.year + 543
                          : r.name}
                    </b>
                  </td>
                  {report === "monthly-by-plot" && <td>{r.name}</td>}
                  {plot && <td>{r.treeCount}</td>}
                  <td className="right income">{money(r.income)}</td>
                  <td className="right expense">{money(r.expense)}</td>
                  <td
                    className={"right " + (r.profit < 0 ? "expense" : "profit")}
                  >
                    {money(r.profit)}
                  </td>
                  {plot &&
                    ["incomePerTree", "expensePerTree", "profitPerTree"].map(
                      (k) => (
                        <td className="right" key={k}>
                          {money(r[k])}
                        </td>
                      ),
                    )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}

function Editor({ modal, boot, busy, error, onClose, onSave }) {
  const { resource, record } = modal;
  const [v, setV] = useState(() => ({
    ...record,
    transactionDate: record.transactionDate?.slice(0, 10) || today(),
    plantedDate: record.plantedDate?.slice(0, 10) || "",
    effectiveDate: record.id ? "" : today(),
    status: record.status || "ACTIVE",
    type: record.type || "EXPENSE",
    treeCount: record.treeCount ?? 0,
    areaUnit: record.areaUnit || "ไร่",
    role: record.role || "STAFF",
  }));
  const set = (k, value) =>
    setV((p) => {
      const next = {
        ...p,
        [k]: value,
        ...(k === "farmId" ? { plotId: "" } : {}),
        ...(k === "type" ? { categoryId: "" } : {}),
      };
      if (
        ["unitPrice", "quantity"].includes(k) &&
        next.unitPrice !== "" &&
        next.quantity !== "" &&
        next.unitPrice != null &&
        next.quantity != null
      )
        next.amount = (Number(next.unitPrice) * Number(next.quantity)).toFixed(
          2,
        );
      return next;
    });
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = document.getElementById("editor-dialog");
    dialog?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const items = dialog.querySelectorAll(
          "button:not(:disabled), input, select, textarea",
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [busy, onClose]);
  const input = (k, label, type = "text", required = false) => (
    <Field
      key={k}
      label={label}
      type={type}
      value={v[k] ?? ""}
      onChange={(e) => set(k, e.target.value)}
      required={required}
      step={
        type === "number"
          ? k === "treeCount" || k === "plantedYear"
            ? "1"
            : "0.0001"
          : undefined
      }
      min={type === "number" ? "0" : undefined}
    />
  );
  const select = (k, label, options, required = false) => (
    <Select
      label={label}
      value={v[k]}
      onChange={(value) => set(k, value)}
      options={options}
      required={required}
      empty={required ? "กรุณาเลือก" : "ไม่ระบุ"}
    />
  );
  const active = (rows) =>
    rows.filter(
      (r) =>
        r.status === "ACTIVE" ||
        r.id === v.farmId ||
        r.id === v.plotId ||
        r.id === v.categoryId ||
        r.id === v.unitId ||
        r.id === v.cropTypeId,
    );
  function submit(e) {
    e.preventDefault();
    const out = { ...v };
    for (const k of [
      "plotId",
      "unitId",
      "cropTypeId",
      "plantedDate",
      "plantedYear",
    ])
      if (!out[k]) out[k] = null;
    if (!out.password) delete out.password;
    if (!out.effectiveDate) delete out.effectiveDate;
    if (resource === "users") out.email = out.email?.toLowerCase();
    onSave(out);
  }
  return (
    <div className="modal-backdrop">
      <section
        id="editor-dialog"
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">FARM LEDGER</span>
            <h2 id="editor-title">
              {record.id ? "แก้ไข" : "เพิ่ม"}
              {resource === "transactions"
                ? "รายการบัญชี"
                : masterNames[resource]}
            </h2>
          </div>
          <button
            aria-label="ปิด"
            className="icon-button"
            disabled={busy}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            {resource === "transactions" ? (
              <>
                <div className="type-toggle">
                  {["INCOME", "EXPENSE"].map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={
                        v.type === type
                          ? "selected " +
                            (type === "INCOME" ? "income" : "expense")
                          : ""
                      }
                      onClick={() => set("type", type)}
                    >
                      {type === "INCOME" ? (
                        <ArrowDownRight size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}{" "}
                      {type === "INCOME" ? "รายรับ" : "รายจ่าย"}
                    </button>
                  ))}
                </div>
                <div className="form-grid">
                  {input("transactionDate", "วันที่ *", "date", true)}
                  {select(
                    "categoryId",
                    "หมวดหมู่ *",
                    active(boot.categories).filter((c) => c.type === v.type),
                    true,
                  )}
                  {select("farmId", "สวน *", active(boot.farms), true)}
                  {select(
                    "plotId",
                    "แปลง",
                    active(boot.plots).filter((p) => p.farmId === v.farmId),
                  )}
                  {input("unitPrice", "ราคาต่อหน่วย", "number")}
                  {input("quantity", "จำนวน / น้ำหนัก", "number")}
                  {select("unitId", "หน่วย", active(boot.units))}
                  <Field label="จำนวนเงิน (บาท) *">
                    <input
                      type="number"
                      value={v.amount ?? ""}
                      step="0.01"
                      min="0.01"
                      required
                      onChange={(e) => set("amount", e.target.value)}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="calculate"
                  disabled={
                    v.unitPrice == null ||
                    v.quantity == null ||
                    v.unitPrice === "" ||
                    v.quantity === ""
                  }
                  onClick={() =>
                    set(
                      "amount",
                      (Number(v.unitPrice) * Number(v.quantity)).toFixed(2),
                    )
                  }
                >
                  คำนวณ ราคา × จำนวน = ฿{" "}
                  {money(Number(v.unitPrice || 0) * Number(v.quantity || 0))}
                </button>
                <p className="muted">
                  กดคำนวณเพื่อเติมยอดเงิน หรือระบุยอดเองได้
                </p>
                {input("description", "รายละเอียด")}
                {input("remark", "หมายเหตุ")}
                {input("referenceNo", "เลขที่เอกสาร")}
              </>
            ) : (
              <>
                <div className="form-grid">
                  {input("name", "ชื่อ *", "text", true)}
                  {["categories", "crop-types", "units"].includes(resource) &&
                    input("code", "รหัส *", "text", true)}
                  {resource === "categories" &&
                    select(
                      "type",
                      "ประเภท *",
                      [
                        { id: "INCOME", name: "รายรับ" },
                        { id: "EXPENSE", name: "รายจ่าย" },
                      ],
                      true,
                    )}
                  {["farms", "plots"].includes(resource) &&
                    select("cropTypeId", "ประเภทพืช", active(boot.cropTypes))}
                  {resource === "plots" && (
                    <>
                      {select("farmId", "สวน *", active(boot.farms), true)}
                      {input("code", "รหัสแปลง")}
                      {input("treeCount", "จำนวนต้น *", "number", true)}
                      {input(
                        "effectiveDate",
                        "วันที่เริ่มใช้จำนวนต้น",
                        "date",
                        !record.id || Number(v.treeCount) !== record.treeCount,
                      )}
                      {input("area", "ขนาดพื้นที่", "number")}
                      {input("areaUnit", "หน่วยพื้นที่")}
                      {input("plantedDate", "วันที่เริ่มปลูก", "date")}
                      {input("plantedYear", "ปีที่ปลูก (ค.ศ.)", "number")}
                    </>
                  )}
                  {resource === "users" ? (
                    <>
                      {input("email", "อีเมล *", "email", true)}
                      {input(
                        "password",
                        record.id
                          ? "รหัสผ่านใหม่ (เว้นว่างเพื่อคงเดิม)"
                          : "รหัสผ่าน (อย่างน้อย 10 ตัว) *",
                        "password",
                        !record.id,
                      )}
                      {select(
                        "role",
                        "สิทธิ์ *",
                        ["OWNER", "ADMIN", "STAFF", "VIEWER"].map((id) => ({
                          id,
                          name: id,
                        })),
                        true,
                      )}
                    </>
                  ) : (
                    select(
                      "status",
                      "สถานะ",
                      [
                        { id: "ACTIVE", name: "ใช้งาน" },
                        { id: "INACTIVE", name: "ปิดใช้งาน" },
                      ],
                      true,
                    )
                  )}
                </div>
                {["farms", "categories"].includes(resource) &&
                  input("description", "รายละเอียด")}
                {resource === "plots" && (
                  <p className="muted">
                    ระบุวันที่เพื่อบันทึกจำนวนต้นให้รายงานใช้ตั้งแต่วันนั้น
                    แม้จำนวนต้นเท่าเดิม
                    หากแก้ไขข้อมูลอื่นและไม่ต้องการเพิ่มประวัติ
                    ให้เว้นวันที่ว่าง
                    วันที่เริ่มปลูกไม่เปลี่ยนประวัติจำนวนต้นโดยอัตโนมัติ
                  </p>
                )}
                {resource === "plots" && input("note", "หมายเหตุ")}
                {resource === "plots" && record.treeHistories?.length > 0 && (
                  <details>
                    <summary>ประวัติจำนวนต้น</summary>
                    {record.treeHistories.map((h) => (
                      <p key={h.id}>
                        {h.startDate.slice(0, 10)} · {h.treeCount} ต้น
                      </p>
                    ))}
                  </details>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              ยกเลิก
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
