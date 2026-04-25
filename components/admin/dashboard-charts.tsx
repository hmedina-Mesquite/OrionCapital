"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts"
import { formatMXN } from "@/lib/money"

const PIE_COLORS = [
  "var(--color-chart-1, #6366f1)",
  "var(--color-chart-2, #22c55e)",
  "var(--color-chart-3, #f97316)",
  "var(--color-chart-4, #06b6d4)",
  "var(--color-chart-5, #ef4444)",
]

export function MonthlyCollectionsChart({
  data,
}: {
  data: { month: string; total: number; capital: number; interes: number }[]
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Cobranza mensual</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="currentColor" fontSize={11} />
            <YAxis
              stroke="currentColor"
              fontSize={11}
              tickFormatter={(v) =>
                Number(v).toLocaleString("es-MX", { notation: "compact" })
              }
            />
            <Tooltip
              formatter={(v) => formatMXN(Number(v))}
              labelClassName="text-foreground"
              contentStyle={{
                background: "var(--color-popover, #fff)",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="capital"
              stroke={PIE_COLORS[0]}
              strokeWidth={2}
              dot={false}
              name="Capital"
            />
            <Line
              type="monotone"
              dataKey="interes"
              stroke={PIE_COLORS[1]}
              strokeWidth={2}
              dot={false}
              name="Interés"
            />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function SourceMixChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Mezcla de fuentes</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              innerRadius={50}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMXN(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ScheduleStatusChart({
  data,
}: {
  data: { estado: string; cuotas: number }[]
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium mb-3">Cuotas por estado</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="estado" stroke="currentColor" fontSize={11} />
            <YAxis stroke="currentColor" fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="cuotas" fill={PIE_COLORS[3]} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
