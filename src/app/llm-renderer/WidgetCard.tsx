import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  DollarSign,
  FileText,
  Info,
  Layers,
  LineChart as LineChartIcon,
  List,
  PieChart as PieChartIcon,
  Table2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import ReactMarkdown from "react-markdown";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import remarkGfm from "remark-gfm";

const DEBUG_MODE = true;

// ==========================================
// 1. Type Definitions
// ==========================================

export type WidgetType =
  | "stat"
  | "line"
  | "bar"
  | "pie"
  | "area"
  | "table"
  | "list"
  | "markdown";

interface BaseWidget {
  id: string;
  title: string;
  description?: string;
  colSpan?: 1 | 2 | 3 | 4;
}

export type CardColorTheme =
  | "blue"
  | "emerald"
  | "violet"
  | "amber"
  | "sky"
  | "cyan"
  | "indigo"
  | "teal"
  | "orange"
  | "stone"
  | "slate";

interface StatData {
  value: number;
  change?: number;
  trend?: "up" | "down" | "neutral";
}

interface StatConfig {
  prefix?: string;
  suffix?: string;
  icon?: "users" | "dollar" | "activity" | "alert" | "info";
  color?: string;
  colorTheme?: CardColorTheme;
}

interface StatWidgetDef extends BaseWidget {
  type: "stat";
  data: StatData;
  config?: StatConfig;
}

interface ChartPoint {
  name: string;
  [key: string]: string | number;
}

interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  prefix?: string;
  colorTheme?: CardColorTheme;
}

interface ChartWidgetDef extends BaseWidget {
  type: "line" | "bar" | "area";
  data: ChartPoint[];
  config?: ChartConfig;
}

interface PiePoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieWidgetDef extends BaseWidget {
  type: "pie";
  data: PiePoint[];
  config?: ChartConfig & { colorTheme?: CardColorTheme };
}

interface TableWidgetDef extends BaseWidget {
  type: "table";
  data: Record<string, string | number | boolean>[];
  config?: {
    hiddenColumns?: string[];
    rowsPerPage?: number;
    colorTheme?: CardColorTheme;
  };
}

export interface ListItem {
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: "success" | "warning" | "error" | "neutral";
  timestamp?: string;
}

interface ListWidgetDef extends BaseWidget {
  type: "list";
  data: ListItem[];
  config?: {
    showIcon?: boolean;
    colorTheme?: CardColorTheme;
  };
}

interface MarkdownWidgetDef extends BaseWidget {
  type: "markdown";
  data: {
    content: string;
  };
  config?: {
    colorTheme?: CardColorTheme;
  };
}

export type ScreenWidget =
  | StatWidgetDef
  | ChartWidgetDef
  | PieWidgetDef
  | TableWidgetDef
  | ListWidgetDef
  | MarkdownWidgetDef;

// ==========================================
// 2. Color Theme Utilities
// ==========================================

export const colorThemes: Record<
  CardColorTheme,
  {
    gradient: string;
    border: string;
    headerBg: string;
    headerText: string;
    accent: string;
    accentLight: string;
    iconBg: string;
    iconText: string;
    chartColors: string[];
  }
> = {
  blue: {
    gradient: "from-blue-50 via-white to-white",
    border: "border-blue-200",
    headerBg: "bg-gradient-to-r from-blue-500 to-blue-600",
    headerText: "text-white",
    accent: "#3b82f6",
    accentLight: "#dbeafe",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    chartColors: ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#2563eb"],
  },
  emerald: {
    gradient: "from-emerald-50 via-white to-white",
    border: "border-emerald-200",
    headerBg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    headerText: "text-white",
    accent: "#10b981",
    accentLight: "#d1fae5",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    chartColors: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857"],
  },
  violet: {
    gradient: "from-violet-50 via-white to-white",
    border: "border-violet-200",
    headerBg: "bg-gradient-to-r from-violet-500 to-violet-600",
    headerText: "text-white",
    accent: "#8b5cf6",
    accentLight: "#ede9fe",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    chartColors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed", "#6d28d9"],
  },
  amber: {
    gradient: "from-amber-50 via-white to-white",
    border: "border-amber-200",
    headerBg: "bg-gradient-to-r from-amber-500 to-amber-600",
    headerText: "text-white",
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    chartColors: ["#f59e0b", "#fbbf24", "#fcd34d", "#d97706", "#b45309"],
  },
  sky: {
    gradient: "from-sky-50 via-white to-white",
    border: "border-sky-200",
    headerBg: "bg-gradient-to-r from-sky-500 to-sky-600",
    headerText: "text-white",
    accent: "#0ea5e9",
    accentLight: "#e0f2fe",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    chartColors: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#0284c7", "#0369a1"],
  },
  cyan: {
    gradient: "from-cyan-50 via-white to-white",
    border: "border-cyan-200",
    headerBg: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    headerText: "text-white",
    accent: "#06b6d4",
    accentLight: "#cffafe",
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
    chartColors: ["#06b6d4", "#22d3ee", "#67e8f9", "#0891b2", "#0e7490"],
  },
  indigo: {
    gradient: "from-indigo-50 via-white to-white",
    border: "border-indigo-200",
    headerBg: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    headerText: "text-white",
    accent: "#6366f1",
    accentLight: "#e0e7ff",
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-600",
    chartColors: ["#6366f1", "#818cf8", "#a5b4fc", "#4f46e5", "#4338ca"],
  },
  teal: {
    gradient: "from-teal-50 via-white to-white",
    border: "border-teal-200",
    headerBg: "bg-gradient-to-r from-teal-500 to-teal-600",
    headerText: "text-white",
    accent: "#14b8a6",
    accentLight: "#ccfbf1",
    iconBg: "bg-teal-100",
    iconText: "text-teal-600",
    chartColors: ["#14b8a6", "#2dd4bf", "#5eead4", "#0d9488", "#0f766e"],
  },
  orange: {
    gradient: "from-orange-50 via-white to-white",
    border: "border-orange-200",
    headerBg: "bg-gradient-to-r from-orange-500 to-orange-600",
    headerText: "text-white",
    accent: "#f97316",
    accentLight: "#ffedd5",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    chartColors: ["#f97316", "#fb923c", "#fdba74", "#ea580c", "#c2410c"],
  },
  stone: {
    gradient: "from-stone-50 via-white to-white",
    border: "border-stone-200",
    headerBg: "bg-gradient-to-r from-stone-500 to-stone-600",
    headerText: "text-white",
    accent: "#78716c",
    accentLight: "#f5f5f4",
    iconBg: "bg-stone-100",
    iconText: "text-stone-600",
    chartColors: ["#78716c", "#a8a29e", "#d6d3d1", "#57534e", "#44403c"],
  },
  slate: {
    gradient: "from-slate-50 via-white to-white",
    border: "border-slate-200",
    headerBg: "bg-gradient-to-r from-slate-600 to-slate-700",
    headerText: "text-white",
    accent: "#64748b",
    accentLight: "#f1f5f9",
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    chartColors: ["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#334155"],
  },
};

export const getTheme = (themeColor: CardColorTheme = "blue") => {
  return colorThemes[themeColor];
};

const colorThemeKeys: CardColorTheme[] = Object.keys(
  colorThemes
) as CardColorTheme[];

export const getRandomThemeForWidget = (widgetId: string): CardColorTheme => {
  let hash = 0;
  for (let i = 0; i < widgetId.length; i++) {
    const char = widgetId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % colorThemeKeys.length;
  return colorThemeKeys[index];
};

export const getWidgetThemeColor = (widget: ScreenWidget): CardColorTheme => {
  if ("config" in widget && widget.config && "colorTheme" in widget.config) {
    return widget.config.colorTheme as CardColorTheme;
  }
  return getRandomThemeForWidget(widget.id);
};

// ==========================================
// 3. Helper Components
// ==========================================

const MAX_RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 500;

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(true);

  const errorMessage =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  React.useEffect(() => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setIsRetrying(false);
      return;
    }

    const timer = setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      resetErrorBoundary();
    }, RETRY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [retryCount, resetErrorBoundary]);

  if (isRetrying) {
    return (
      <div className="p-4 text-amber-600 bg-amber-50 border border-amber-100 rounded-md m-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-sm">
            Loading widget data... (attempt {retryCount + 1}/{MAX_RETRY_ATTEMPTS})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-red-500 bg-red-50 border border-red-100 rounded-md m-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-semibold text-sm">Widget Error</span>
      </div>
      <p className="text-xs font-mono wrap-break-word">{errorMessage}</p>
      <button
        onClick={() => {
          setRetryCount(0);
          setIsRetrying(true);
          resetErrorBoundary();
        }}
        className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded transition-colors"
      >
        Retry
      </button>
    </div>
  );
};

const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  themeColor?: CardColorTheme;
}> = ({ children, className = "", colSpan = 1, themeColor = "blue" }) => {
  const theme = getTheme(themeColor);
  const colSpanClasses: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-3",
    4: "col-span-1 md:col-span-4",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br ${theme.gradient} rounded-xl border ${
        theme.border
      } shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow ${
        colSpanClasses[colSpan] || "col-span-1"
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};

const CardHeader: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  debugName?: string;
  themeColor?: CardColorTheme;
  useGradientHeader?: boolean;
}> = ({
  title,
  description,
  icon,
  debugName,
  themeColor = "blue",
  useGradientHeader = false,
}) => {
  const theme = getTheme(themeColor);

  if (useGradientHeader) {
    return (
      <div
        className={`px-6 py-4 ${theme.headerBg} flex justify-between items-start`}
      >
        <div>
          <h3 className={`font-semibold ${theme.headerText} text-lg`}>
            {title}
            {DEBUG_MODE && debugName && (
              <span className="ml-2 text-xs font-mono text-white/70 font-normal">
                ({debugName})
              </span>
            )}
          </h3>
          {description && (
            <p className="text-sm text-white/80 mt-1">{description}</p>
          )}
        </div>
        {icon && <div className="text-white/80">{icon}</div>}
      </div>
    );
  }

  return (
    <div
      className="px-6 py-4 border-b flex justify-between items-start"
      style={{ borderColor: theme.accentLight }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-full min-h-[2rem] rounded-full"
          style={{ backgroundColor: theme.accent }}
        />
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">
            {title}
            {DEBUG_MODE && debugName && (
              <span className="ml-2 text-xs font-mono text-slate-400 font-normal">
                ({debugName})
              </span>
            )}
          </h3>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {icon && (
        <div className={`${theme.iconBg} ${theme.iconText} p-2 rounded-lg`}>
          {icon}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. Widget Renderers
// ==========================================

const StatRenderer: React.FC<{
  data: StatData;
  config?: StatConfig;
  themeColor?: CardColorTheme;
}> = ({ data, config = {}, themeColor = "blue" }) => {
  const theme = getTheme(config.colorTheme || themeColor);
  const isPositive = (data.change || 0) >= 0;

  const Icon = (() => {
    switch (config.icon) {
      case "users":
        return Users;
      case "dollar":
        return DollarSign;
      case "activity":
        return Activity;
      case "alert":
        return AlertTriangle;
      default:
        return Info;
    }
  })();

  return (
    <div className="p-6 flex items-center justify-between h-full">
      <div>
        <div className="text-3xl font-bold" style={{ color: theme.accent }}>
          {config.prefix}
          {data.value.toLocaleString()}
          {config.suffix}
        </div>
        {data.change !== undefined && (
          <div
            className={`flex items-center mt-2 text-sm font-medium ${
              isPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {Math.abs(data.change)}%
            <span className="text-slate-400 ml-1 font-normal">
              vs last period
            </span>
          </div>
        )}
      </div>
      <div
        className={`p-4 rounded-2xl ${theme.iconBg} ${theme.iconText}`}
        style={{ boxShadow: `0 4px 14px ${theme.accent}25` }}
      >
        <Icon className="w-7 h-7" />
      </div>
    </div>
  );
};

const ChartRenderer: React.FC<{
  type: "line" | "bar" | "pie" | "area";
  data: Record<string, string | number>[];
  config?: ChartConfig;
  themeColor?: CardColorTheme;
}> = ({ type, data, config = {}, themeColor = "blue" }) => {
  const theme = getTheme(config.colorTheme || themeColor);
  const colors = config.colors || theme.chartColors;
  const dataKeys =
    data.length > 0 ? Object.keys(data[0]).filter((k) => k !== "name") : [];
  const gradientId = `colorValue-${themeColor}`;

  return (
    <div className="p-4 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${theme.accentLight}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        ) : type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${config.prefix || ""}${val}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${theme.accentLight}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            />
            {config.showLegend !== false && <Legend />}
            {dataKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx % colors.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: colors[idx % colors.length],
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
              />
            ))}
          </LineChart>
        ) : type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: theme.accentLight, opacity: 0.5 }}
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${theme.accentLight}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            />
            {config.showLegend !== false && <Legend />}
            {dataKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[idx % colors.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${theme.accentLight}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKeys[0]}
              stroke={colors[0]}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const TableRenderer: React.FC<{
  data: Record<string, string | number | boolean>[];
  themeColor?: CardColorTheme;
}> = ({ data, themeColor = "blue" }) => {
  const theme = getTheme(themeColor);

  if (!data || data.length === 0)
    return <div className="p-6 text-slate-400">No data available</div>;
  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead
          className="text-xs uppercase border-b"
          style={{
            backgroundColor: theme.accentLight,
            color: theme.accent,
            borderColor: theme.accentLight,
          }}
        >
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-6 py-3 font-semibold tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              style={{ backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}
            >
              {headers.map((h) => (
                <td
                  key={`${idx}-${h}`}
                  className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap"
                >
                  {h.toLowerCase().includes("status") ? (
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        row[h] === "Active" || row[h] === "Completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : row[h] === "Pending"
                          ? "bg-amber-100 text-amber-700"
                          : row[h] === "Failed" || row[h] === "Error"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {String(row[h])}
                    </span>
                  ) : (
                    String(row[h])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ListRenderer: React.FC<{
  data: ListItem[];
  themeColor?: CardColorTheme;
}> = ({ data, themeColor = "blue" }) => {
  const theme = getTheme(themeColor);

  return (
    <div className="divide-y divide-slate-100">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
          style={{
            borderLeft: idx === 0 ? `3px solid ${theme.accent}` : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  item.status === "error"
                    ? "#ef4444"
                    : item.status === "warning"
                    ? "#f59e0b"
                    : item.status === "success"
                    ? "#10b981"
                    : theme.accent,
                boxShadow: `0 0 0 3px ${
                  item.status === "error"
                    ? "#fee2e2"
                    : item.status === "warning"
                    ? "#fef3c7"
                    : item.status === "success"
                    ? "#d1fae5"
                    : theme.accentLight
                }`,
              }}
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              {item.subtitle && (
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {item.value && (
              <span
                className="block text-sm font-bold"
                style={{ color: theme.accent }}
              >
                {item.value}
              </span>
            )}
            {item.timestamp && (
              <span className="block text-xs text-slate-400">
                {item.timestamp}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const MarkdownRenderer: React.FC<{
  content: string;
  themeColor?: CardColorTheme;
}> = ({ content, themeColor = "blue" }) => {
  const theme = getTheme(themeColor);

  return (
    <div
      className="p-6 prose prose-slate max-w-none text-slate-700"
      style={
        {
          "--tw-prose-headings": theme.accent,
          "--tw-prose-links": theme.accent,
          "--tw-prose-bold": "#1e293b",
        } as React.CSSProperties
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{ color: theme.accent }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: theme.accent }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: theme.accent }}>{children}</h3>
          ),
          a: ({ children, href }) => (
            <a href={href} style={{ color: theme.accent }}>
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeftColor: theme.accent,
                backgroundColor: theme.accentLight,
              }}
              className="rounded-r-lg"
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code
                style={{
                  backgroundColor: theme.accentLight,
                  color: theme.accent,
                }}
                className="px-1.5 py-0.5 rounded font-mono text-sm"
              >
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// ==========================================
// 5. Main Extracted Component
// ==========================================

const widgetTypeIcons: Record<
  WidgetType,
  React.ComponentType<{ className?: string }>
> = {
  stat: Activity,
  line: LineChartIcon,
  bar: BarChart3,
  area: Layers,
  pie: PieChartIcon,
  table: Table2,
  list: List,
  markdown: FileText,
};

const getWidgetIcon = (widgetType: WidgetType): React.ReactNode => {
  const IconComponent = widgetTypeIcons[widgetType];
  return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
};

const renderWidgetContent = (widget: ScreenWidget) => {
  const themeColor = getWidgetThemeColor(widget);

  switch (widget.type) {
    case "stat":
      return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <StatRenderer
            data={widget.data}
            config={widget.config}
            themeColor={themeColor}
          />
        </ErrorBoundary>
      );
    case "line":
    case "bar":
    case "area":
    case "pie":
      return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ChartRenderer
            type={widget.type}
            data={widget.data}
            config={widget.config}
            themeColor={themeColor}
          />
        </ErrorBoundary>
      );
    case "table":
      return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <TableRenderer data={widget.data} themeColor={themeColor} />
        </ErrorBoundary>
      );
    case "list":
      return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ListRenderer data={widget.data} themeColor={themeColor} />
        </ErrorBoundary>
      );
    case "markdown":
      return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <MarkdownRenderer
            content={widget.data.content}
            themeColor={themeColor}
          />
        </ErrorBoundary>
      );
    default:
      return <div className="p-4 text-red-500">Unknown widget type</div>;
  }
};

interface WidgetCardProps {
  widget: ScreenWidget;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({ widget }) => {
  const themeColor = getWidgetThemeColor(widget);
  return (
    <Card key={widget.id} colSpan={widget.colSpan || 1} themeColor={themeColor}>
      {(widget.title || widget.description) && (
        <CardHeader
          title={widget.title}
          description={widget.description}
          debugName={widget.type}
          themeColor={themeColor}
          icon={getWidgetIcon(widget.type)}
        />
      )}
      <div className="grow">{renderWidgetContent(widget)}</div>
    </Card>
  );
};
