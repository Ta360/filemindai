import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import type { ChartData, ChartDatum } from "../types";

const PALETTE = ["#3865ff", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#0ea5e9", "#64748b"];

export type ChartKind = "bar" | "pie" | "doughnut" | "line" | "area";

interface Props {
  data: ChartData | null;
  onBarClick?: (datum: ChartDatum) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  /** Shrinks height and caps width — used where the chart sits alongside other panels instead of owning the full page. */
  compact?: boolean;
}

export default function ChartPanel({ data, onBarClick, onRefresh, isLoading, compact = false }: Props) {
  const [kind, setKind] = useState<ChartKind>("bar");

  const chartData = useMemo(
    () => (data?.data ?? []).map((d, i) => ({ ...d, color: d.color ?? PALETTE[i % PALETTE.length] })),
    [data]
  );

  function exportCsv() {
    if (!data) return;
    const rows = ["label,value", ...data.data.map((d) => `${d.label},${d.value}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 ${
        compact ? "mx-auto max-w-2xl" : ""
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{data?.title ?? "Live Analytics"}</h3>
        <div className="flex items-center gap-1.5">
          {(["bar", "pie", "doughnut", "line", "area"] as ChartKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${
                kind === k
                  ? "bg-brand-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {k}
            </button>
          ))}
          {onRefresh && (
            <button onClick={onRefresh} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
          <button onClick={exportCsv} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Export">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!data || chartData.length === 0 ? (
        <div className={`flex items-center justify-center text-sm text-slate-400 ${compact ? "h-48" : "h-64"}`}>
          Search your Drive to see live analytics here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={compact ? 220 : 280}>
          {renderChart(kind, chartData, onBarClick, compact)}
        </ResponsiveContainer>
      )}
    </div>
  );
}

function renderChart(
  kind: ChartKind,
  data: (ChartDatum & { color: string })[],
  onBarClick?: (d: ChartDatum) => void,
  compact = false
) {
  switch (kind) {
    case "pie":
    case "doughnut":
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={compact ? 75 : 100}
            innerRadius={kind === "doughnut" ? (compact ? 45 : 60) : 0}
            onClick={(d) => onBarClick?.(d as unknown as ChartDatum)}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} cursor="pointer" />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      );
    case "line":
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3865ff" strokeWidth={2} />
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#3865ff" fill="#8fb4ff" fillOpacity={0.4} />
        </AreaChart>
      );
    case "bar":
    default:
      return (
        <BarChart data={data} barCategoryGap={compact ? "30%" : "15%"}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer" maxBarSize={compact ? 46 : 80} onClick={(d: any) => onBarClick?.(d)}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      );
  }
}
