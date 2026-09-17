"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
} from "recharts";
const labels = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const palette = [
  "#e6a254",
  "#24795c",
  "#7db89a",
  "#b9c780",
  "#dbb7a0",
  "#7c9aa5",
];
export default function Charts({
  monthly,
  expenses,
  periodLabel = "เดือนที่เลือก",
}) {
  const total = expenses.reduce((s, r) => s + r.value, 0);
  return (
    <div className="charts-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>แนวโน้มรายรับ–รายจ่าย</h2>
            <p>ภาพรวมรายเดือนและกำไรสุทธิ</p>
          </div>
          <span className="chart-unit">บาท</span>
        </div>
        <div className="chart-legend">
          <span>
            <i style={{ background: "#24795c" }} />
            รายรับ
          </span>
          <span>
            <i style={{ background: "#edba85" }} />
            รายจ่าย
          </span>
          <span>
            <i style={{ background: "#648db6" }} />
            กำไร
          </span>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthly.map((r) => ({ ...r, name: labels[r.month - 1] }))}
              margin={{ left: 0, right: 15, top: 15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="#e9eeea"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#83908b" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#83908b" }}
                tickFormatter={(n) =>
                  Math.abs(n) >= 1000 ? `${n / 1000}k` : n
                }
              />
              <Tooltip
                formatter={(v, name) => [
                  Number(v).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  }),
                  name,
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8e3" }}
              />
              <Bar
                isAnimationActive={false}
                name="รายรับ"
                dataKey="income"
                fill="#24795c"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                isAnimationActive={false}
                name="รายจ่าย"
                dataKey="expense"
                fill="#edba85"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Line
                isAnimationActive={false}
                name="กำไร"
                dataKey="profit"
                stroke="#648db6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>สัดส่วนรายจ่าย</h2>
            <p>แยกตามหมวดหมู่ใน{periodLabel}</p>
          </div>
        </div>
        <div className="donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={total ? expenses : [{ name: "ไม่มีรายจ่าย", value: 1 }]}
                dataKey="value"
                innerRadius={62}
                outerRadius={84}
                paddingAngle={total ? 3 : 0}
                stroke="none"
              >
                {(total ? expenses : [{}]).map((_, i) => (
                  <Cell
                    key={i}
                    fill={total ? palette[i % palette.length] : "#edf1ed"}
                  />
                ))}
              </Pie>
              {total > 0 && (
                <Tooltip formatter={(v) => Number(v).toLocaleString("th-TH")} />
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-label">
            <span>รายจ่ายรวม</span>
            <b>{total.toLocaleString("th-TH")}</b>
            <small>บาท</small>
          </div>
        </div>
        <div className="expense-legend">
          {expenses.length ? (
            expenses.slice(0, 5).map((e, i) => (
              <div key={e.name}>
                <i style={{ background: palette[i % palette.length] }} />
                <span>{e.name}</span>
                <b>{((e.value / total) * 100).toFixed(1)}%</b>
              </div>
            ))
          ) : (
            <p className="muted">ยังไม่มีรายจ่ายใน{periodLabel}</p>
          )}
        </div>
      </section>
    </div>
  );
}
