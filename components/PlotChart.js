"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
export default function PlotChart({
  plots = [],
  periodLabel = "เดือนที่เลือก",
}) {
  if (!plots.length) return null;
  return (
    <section className="panel plot-chart">
      <div className="panel-heading">
        <div>
          <h2>เปรียบเทียบผลประกอบการแต่ละแปลง</h2>
          <p>รายรับ ต้นทุน และกำไรของ{periodLabel} · หน่วย: บาท</p>
        </div>
      </div>
      <div style={{ height: 260, padding: "0 15px 20px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={plots}>
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="#e9eeea"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) =>
                Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 })
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="income"
              name="รายรับ"
              fill="#24795c"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
            <Bar
              dataKey="expense"
              name="ต้นทุน"
              fill="#edba85"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
            <Bar
              dataKey="profit"
              name="กำไร / ขาดทุน"
              fill="#648db6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
