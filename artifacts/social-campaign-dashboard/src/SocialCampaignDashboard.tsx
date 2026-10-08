import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCampaignCsv,
  getGetCampaignCsvQueryKey,
} from "@workspace/api-client-react";
import Papa from "papaparse";
import { CSVLink } from "react-csv";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownWideNarrow,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  FileUp,
  FilterX,
  Moon,
  Printer,
  RefreshCw,
  Search,
  Sun,
  Target,
  TrendingUp,
  Wallet,
  MousePointerClick,
  X,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";

type CampaignRow = {
  date: string;
  campaign_id: string;
  campaign_name: string;
  channel: string;
  audience: string;
  campaign_goal: string;
  spend_usd: number;
  clicks: number;
  conversions: number;
  revenue_usd: number;
};

type ViewKey = "Overview" | "Platform Comparison" | "Campaign Details" | "Time Series";
type Filters = { from: string; to: string; channel: string; audience: string; goal: string };
type Totals = { spend: number; clicks: number; conversions: number; revenue: number };
type CampaignAggregate = CampaignRow & Totals & { days: number; roi: number; cvr: number };

const REQUIRED_HEADERS = [
  "date", "campaign_id", "campaign_name", "channel", "audience",
  "campaign_goal", "spend_usd", "clicks", "conversions", "revenue_usd",
];
const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#3978c5",
  Instagram: "#a478c8",
  Pinterest: "#dc766e",
  Twitter: "#45a894",
};
const FALLBACK_COLORS = ["#3978c5", "#a478c8", "#45a894", "#d69b53", "#dc766e"];
const INTERVAL_OPTIONS = [
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every 1 hour", ms: 60 * 60 * 1000 },
  { label: "Every 24 hours", ms: 24 * 60 * 60 * 1000 },
];
const NAV_ITEMS: { label: ViewKey; icon: typeof BarChart3; eyebrow: string }[] = [
  { label: "Overview", icon: Activity, eyebrow: "01" },
  { label: "Platform Comparison", icon: BarChart3, eyebrow: "02" },
  { label: "Campaign Details", icon: Target, eyebrow: "03" },
  { label: "Time Series", icon: TrendingUp, eyebrow: "04" },
];
const fmtUSD = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
const fmtCount = (value: number) => new Intl.NumberFormat("en-US").format(value);
const fmtPct = (value: number) => `${value.toFixed(1)}%`;
const dateLabel = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const roiOf = (spend: number, revenue: number) => spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

function parseCampaignCsv(csv: string): CampaignRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) {
    const issue = parsed.errors[0];
    throw new Error(`CSV parsing issue${issue.row !== undefined ? ` on row ${issue.row + 2}` : ""}: ${issue.message}`);
  }
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
  if (!parsed.data.length) throw new Error("This CSV has headers but no campaign rows.");
  return parsed.data.map((record, index) => {
    const rowNumber = index + 2;
    const date = (record.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Row ${rowNumber}: date must use YYYY-MM-DD format.`);
    }
    const [year, month, day] = date.split("-").map(Number);
    const validDate = new Date(Date.UTC(year, month - 1, day));
    if (validDate.getUTCFullYear() !== year || validDate.getUTCMonth() !== month - 1 || validDate.getUTCDate() !== day) {
      throw new Error(`Row ${rowNumber}: "${date}" is not a valid calendar date.`);
    }
    const numberFields = ["spend_usd", "clicks", "conversions", "revenue_usd"] as const;
    const numeric = {} as Pick<CampaignRow, typeof numberFields[number]>;
    for (const field of numberFields) {
      const value = (record[field] ?? "").trim();
      const parsedValue = value === "" ? Number.NaN : Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new Error(`Row ${rowNumber}: ${field} must be a non-negative number.`);
      }
      if ((field === "clicks" || field === "conversions") && !Number.isInteger(parsedValue)) {
        throw new Error(`Row ${rowNumber}: ${field} must be a whole number.`);
      }
      numeric[field] = parsedValue;
    }
    const textFields = ["campaign_id", "campaign_name", "channel", "audience", "campaign_goal"] as const;
    for (const field of textFields) {
      if (!(record[field] ?? "").trim()) throw new Error(`Row ${rowNumber}: ${field} cannot be blank.`);
    }
    return {
      date,
      campaign_id: record.campaign_id.trim(),
      campaign_name: record.campaign_name.trim(),
      channel: record.channel.trim(),
      audience: record.audience.trim(),
      campaign_goal: record.campaign_goal.trim(),
      ...numeric,
    };
  });
}

function aggregate(rows: CampaignRow[]): Totals {
  return rows.reduce<Totals>((result, row) => ({
    spend: result.spend + row.spend_usd,
    clicks: result.clicks + row.clicks,
    conversions: result.conversions + row.conversions,
    revenue: result.revenue + row.revenue_usd,
  }), { spend: 0, clicks: 0, conversions: 0, revenue: 0 });
}

function IconButton({ label, onClick, children, disabled = false }: {
  label: string; onClick: () => void; children: ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      data-testid={`button-${label.toLowerCase().replaceAll(" ", "-")}`}
      className="icon-button disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ChartCard({ title, description, data, filename, children, className = "" }: {
  title: string; description: string; data: object[]; filename: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel chart-card ${className}`} data-testid={`card-${filename.replace(".csv", "")}`}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{description}</p>
        </div>
        {data.length > 0 && (
          <CSVLink data={data} filename={filename} className="icon-button print:hidden" aria-label={`Export ${title} chart data as CSV`} data-testid={`export-${filename}`}>
            <Download size={15} />
          </CSVLink>
        )}
      </div>
      <div className="chart-area">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, note, icon: Icon, accent = false }: {
  label: string; value: string; note: string; icon: typeof Wallet; accent?: boolean;
}) {
  return (
    <section className={`metric-card ${accent ? "metric-card-accent" : ""}`} data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={16} /></span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </section>
  );
}

function NoRows({ title = "Nothing in this slice", message = "Try widening your date range or clearing one of the filters." }: {
  title?: string; message?: string;
}) {
  return (
    <div className="empty-state" data-testid="empty-filter-results">
      <div className="empty-glyph"><FilterX size={20} /></div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function SocialCampaignDashboard() {
  const queryClient = useQueryClient();
  const query = useGetCampaignCsv({
    query: { queryKey: getGetCampaignCsvQueryKey(), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  });
  const [view, setView] = useState<ViewKey>("Overview");
  const [uploadedRows, setUploadedRows] = useState<CampaignRow[] | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isDark, setIsDark] = useState(() => typeof window !== "undefined" && localStorage.getItem("campaign-theme") === "dark");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalMs, setIntervalMs] = useState(INTERVAL_OPTIONS[0].ms);
  const [refreshMenuOpen, setRefreshMenuOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spend" | "revenue" | "roi" | "conversions">("spend");
  const [seriesMetric, setSeriesMetric] = useState<"revenue" | "spend" | "conversions" | "clicks">("revenue");
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", channel: "all", audience: "all", goal: "all" });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("campaign-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setRefreshMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: getGetCampaignCsvQueryKey() });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, intervalMs, queryClient]);

  useEffect(() => {
    if (query.isFetching) {
      setIsSpinning(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setIsSpinning(false), 600);
    return () => window.clearTimeout(timer);
  }, [query.isFetching]);

  const sampleRows = useMemo(() => {
    if (typeof query.data !== "string") return [];
    try { return parseCampaignCsv(query.data); } catch { return []; }
  }, [query.data]);
  const rows = uploadedRows ?? sampleRows;
  const isLocalFile = uploadedRows !== null;
  const sourceError = query.error || (query.data && !sampleRows.length && !isLocalFile ? new Error("The sample campaign CSV could not be validated.") : null);
  const loading = !isLocalFile && (query.isLoading || query.isFetching);
  const dateBounds = useMemo(() => {
    if (!rows.length) return { min: "", max: "" };
    const dates = rows.map((row) => row.date).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [rows]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      from: current.from && dateBounds.min && current.from >= dateBounds.min ? current.from : dateBounds.min,
      to: current.to && dateBounds.max && current.to <= dateBounds.max ? current.to : dateBounds.max,
    }));
  }, [dateBounds.min, dateBounds.max]);

  const options = useMemo(() => ({
    channels: [...new Set(rows.map((row) => row.channel))].sort(),
    audiences: [...new Set(rows.map((row) => row.audience))].sort(),
    goals: [...new Set(rows.map((row) => row.campaign_goal))].sort(),
  }), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) =>
    (!filters.from || row.date >= filters.from) &&
    (!filters.to || row.date <= filters.to) &&
    (filters.channel === "all" || row.channel === filters.channel) &&
    (filters.audience === "all" || row.audience === filters.audience) &&
    (filters.goal === "all" || row.campaign_goal === filters.goal)
  ), [rows, filters]);
  const totals = useMemo(() => aggregate(filteredRows), [filteredRows]);
  const groupedCampaigns = useMemo<CampaignAggregate[]>(() => {
    const grouped = new Map<string, CampaignRow[]>();
    filteredRows.forEach((row) => grouped.set(row.campaign_id, [...(grouped.get(row.campaign_id) ?? []), row]));
    return Array.from(grouped.values()).map((campaign) => {
      const sum = aggregate(campaign);
      const first = campaign[0];
      return {
        ...first, ...sum, days: new Set(campaign.map((row) => row.date)).size,
        roi: roiOf(sum.spend, sum.revenue),
        cvr: sum.clicks ? (sum.conversions / sum.clicks) * 100 : 0,
      };
    });
  }, [filteredRows]);
  const channels = useMemo(() => {
    const grouped = new Map<string, CampaignRow[]>();
    filteredRows.forEach((row) => grouped.set(row.channel, [...(grouped.get(row.channel) ?? []), row]));
    return [...grouped.entries()].map(([channel, channelRows]) => {
      const sum = aggregate(channelRows);
      return { channel, ...sum, roi: roiOf(sum.spend, sum.revenue), cpa: sum.conversions ? sum.spend / sum.conversions : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredRows]);
  const timeSeries = useMemo(() => {
    const grouped = new Map<string, CampaignRow[]>();
    filteredRows.forEach((row) => grouped.set(row.date, [...(grouped.get(row.date) ?? []), row]));
    return [...grouped.entries()].map(([date, dateRows]) => ({ date, ...aggregate(dateRows) })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);
  const searchableCampaigns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return groupedCampaigns.filter((campaign) => !needle || [
      campaign.campaign_id, campaign.campaign_name, campaign.channel, campaign.audience, campaign.campaign_goal,
    ].some((value) => value.toLowerCase().includes(needle))).sort((a, b) => b[sortBy] - a[sortBy]);
  }, [groupedCampaigns, search, sortBy]);
  const winningChannel = [...channels].sort((a, b) => b.roi - a.roi)[0];
  const winningCampaign = [...groupedCampaigns].sort((a, b) => b.roi - a.roi)[0];
  const lastRefreshed = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
  const gridColor = isDark ? "rgba(220,230,225,0.11)" : "#e7e9e4";
  const tickColor = isDark ? "#aab5b0" : "#77817b";
  const tooltipStyle = {
    backgroundColor: isDark ? "#202b29" : "#fffefa",
    border: `1px solid ${isDark ? "#394744" : "#e3e5df"}`,
    borderRadius: 8, color: isDark ? "#e7eeeb" : "#27342f", fontSize: 12,
  };

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function clearFilters() {
    setFilters({ from: dateBounds.min, to: dateBounds.max, channel: "all", audience: "all", goal: "all" });
  }
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setUploadError("");
    try {
      const csv = await file.text();
      const validRows = parseCampaignCsv(csv);
      setUploadedRows(validRows);
      setUploadName(file.name);
      setFilters({ from: "", to: "", channel: "all", audience: "all", goal: "all" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The selected file could not be read.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  }
  function resetToSample() {
    setUploadedRows(null);
    setUploadName("");
    setUploadError("");
    setFilters({ from: "", to: "", channel: "all", audience: "all", goal: "all" });
    void query.refetch();
  }
  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: getGetCampaignCsvQueryKey() });
  }
  function resetDateRange() {
    setFilter("from", dateBounds.min);
    setFilter("to", dateBounds.max);
  }
  const chartAxis = { fontSize: 11, fill: tickColor };
  function renderOverview() {
    return (
      <>
        <div className="metric-grid metric-grid-overview">
          <MetricCard label="Spend" value={fmtUSD(totals.spend)} note="Total media investment" icon={Wallet} />
          <MetricCard label="Clicks" value={fmtCount(totals.clicks)} note="Total ad interactions" icon={MousePointerClick} />
          <MetricCard label="Conversions" value={fmtCount(totals.conversions)} note="Tracked outcomes" icon={Target} />
          <MetricCard label="Revenue" value={fmtUSD(totals.revenue)} note="Attributed revenue · USD" icon={TrendingUp} accent />
          <MetricCard label="ROI" value={fmtPct(roiOf(totals.spend, totals.revenue))} note="Calculated from totals" icon={ArrowUpRight} />
        </div>
        {filteredRows.length === 0 ? <NoRows /> : (
          <>
            <div className="chart-grid chart-grid-feature">
              <ChartCard title="Spend vs. conversions" description="Daily spend · USD and conversion volume · counts" data={timeSeries} filename="spend-vs-conversions.csv" className="chart-feature">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="spendWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3978c5" stopOpacity={0.26} /><stop offset="100%" stopColor="#3978c5" stopOpacity={0.015} /></linearGradient></defs>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dateLabel} tick={chartAxis} axisLine={false} tickLine={false} minTickGap={32} />
                    <YAxis yAxisId="spend" tickFormatter={(value) => fmtUSD(value, true)} tick={chartAxis} axisLine={false} tickLine={false} width={55} />
                    <YAxis yAxisId="conversions" orientation="right" tick={chartAxis} axisLine={false} tickLine={false} width={42} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [name === "Spend (USD)" ? fmtUSD(value) : fmtCount(value), name]} labelFormatter={(label) => dateLabel(String(label))} />
                    <Legend verticalAlign="top" align="right" height={25} iconType="circle" wrapperStyle={{ color: tickColor, fontSize: 11 }} />
                    <Area yAxisId="spend" dataKey="spend" name="Spend (USD)" type="monotone" stroke="#3978c5" strokeWidth={2.5} fill="url(#spendWash)" isAnimationActive={false} />
                    <Line yAxisId="conversions" dataKey="conversions" name="Conversions" type="monotone" stroke="#d69b53" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Channel return" description="ROI from campaign totals" data={channels} filename="channel-return.csv">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} layout="vertical" margin={{ top: 5, right: 18, bottom: 0, left: 2 }}>
                    <CartesianGrid stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${value}%`} tick={chartAxis} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="channel" tick={chartAxis} axisLine={false} tickLine={false} width={70} />
                    <ReferenceLine x={0} stroke={tickColor} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtPct(value), "ROI"]} cursor={{ fill: "rgba(100,120,110,.08)" }} />
                    <Bar dataKey="roi" name="ROI" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={17}>
                      {channels.map((entry, index) => <Cell key={entry.channel} fill={PLATFORM_COLORS[entry.channel] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="insight-strip">
              <div className="insight-mark"><TrendingUp size={18} /></div>
              <div className="insight-copy">
                <span className="eyebrow">At a glance</span>
                {winningChannel
                  ? <p><strong>{winningChannel.channel}</strong> leads on return at <b>{fmtPct(winningChannel.roi)}</b>; {winningCampaign ? <><strong>{winningCampaign.campaign_name}</strong> is the top campaign by ROI.</> : "No campaign leader available."}</p>
                  : <p>Once campaign rows are in view, your strongest channel and campaign will surface here.</p>}
              </div>
              <span className="insight-period">{filteredRows.length.toLocaleString()} daily rows analyzed</span>
            </div>
            <CampaignTable campaigns={searchableCampaigns.slice(0, 6)} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} compact />
          </>
        )}
      </>
    );
  }

  function renderPlatformComparison() {
    return (
      <>
        <div className="section-lead">
          <div><span className="eyebrow">Channel mix</span><h2>Where budget turns into outcomes.</h2></div>
          <p>Compare every platform on spend, attributed revenue, and return across the same filtered period.</p>
        </div>
        {filteredRows.length === 0 ? <NoRows /> : (
          <>
            <div className="metric-grid metric-grid-compact">
              <MetricCard label="Active channels" value={String(channels.length)} note="In the current selection" icon={BarChart3} />
              <MetricCard label="Best ROI" value={winningChannel ? fmtPct(winningChannel.roi) : "—"} note={winningChannel?.channel ?? "No channel data"} icon={ArrowUpRight} accent />
              <MetricCard label="Top revenue" value={channels[0] ? fmtUSD(channels[0].revenue) : "—"} note={channels[0]?.channel ?? "No channel data"} icon={TrendingUp} />
              <MetricCard label="Avg. cost / conversion" value={totals.conversions ? fmtUSD(totals.spend / totals.conversions) : "—"} note="USD per conversion" icon={MousePointerClick} />
            </div>
            <div className="chart-grid">
              <ChartCard title="Spend vs. revenue" description="USD totals by social channel" data={channels} filename="channel-spend-revenue.csv">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="channel" tick={chartAxis} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => fmtUSD(value, true)} tick={chartAxis} axisLine={false} tickLine={false} width={55} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [fmtUSD(value), name]} />
                    <Bar dataKey="spend" name="Spend (USD)" fill="#a9b8b1" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={24} />
                    <Bar dataKey="revenue" name="Revenue (USD)" fill="#3978c5" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Return on ad spend" description="ROI percentage, calculated from aggregate totals" data={channels} filename="channel-roi.csv">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="channel" tick={chartAxis} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `${value}%`} tick={chartAxis} axisLine={false} tickLine={false} width={48} />
                    <ReferenceLine y={0} stroke={tickColor} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtPct(value), "ROI"]} cursor={false} />
                    <Bar dataKey="roi" name="ROI" fill="#45a894" radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="channel-breakdown">
              {channels.map((channel, index) => (
                <article className="channel-row" key={channel.channel} data-testid={`channel-${channel.channel.toLowerCase()}`}>
                  <span className="channel-rank">0{index + 1}</span>
                  <span className="channel-swatch" style={{ background: PLATFORM_COLORS[channel.channel] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] }} />
                  <div className="channel-name"><strong>{channel.channel}</strong><span>{fmtCount(channel.conversions)} conversions · {fmtCount(channel.clicks)} clicks</span></div>
                  <div className="channel-value"><small>Spend</small><strong>{fmtUSD(channel.spend)}</strong></div>
                  <div className="channel-value"><small>Revenue</small><strong>{fmtUSD(channel.revenue)}</strong></div>
                  <div className={`channel-value channel-return ${channel.roi < 0 ? "negative" : ""}`}><small>ROI</small><strong>{fmtPct(channel.roi)}</strong></div>
                  <div className="roi-track"><i style={{ width: `${Math.min(Math.max(channel.roi / Math.max(...channels.map((entry) => entry.roi), 1) * 100, 4), 100)}%` }} /></div>
                </article>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  function renderCampaignDetails() {
    return (
      <>
        <div className="section-lead">
          <div><span className="eyebrow">Campaign-level rollup</span><h2>Find the campaigns doing the work.</h2></div>
          <p>Daily rows are grouped by campaign ID. Search, sort, and compare aggregate outcomes without double-counting ROI.</p>
        </div>
        {filteredRows.length === 0 ? <NoRows /> : (
          <>
            <div className="metric-grid metric-grid-compact">
              <MetricCard label="Campaigns" value={String(groupedCampaigns.length)} note="Unique campaign IDs" icon={Target} />
              <MetricCard label="Conversions" value={fmtCount(totals.conversions)} note="Across filtered campaigns" icon={MousePointerClick} />
              <MetricCard label="Avg. conversion rate" value={totals.clicks ? fmtPct(totals.conversions / totals.clicks * 100) : "0.0%"} note="Conversions ÷ clicks" icon={Activity} accent />
              <MetricCard label="Daily records" value={fmtCount(filteredRows.length)} note="Rows in the current slice" icon={CalendarDays} />
            </div>
            <CampaignTable campaigns={searchableCampaigns} search={search} setSearch={setSearch} sortBy={sortBy} setSortBy={setSortBy} />
          </>
        )}
      </>
    );
  }

  function renderTimeSeries() {
    const valueKey = seriesMetric;
    const valueTitle: Record<typeof seriesMetric, string> = {
      revenue: "Revenue (USD)", spend: "Spend (USD)", conversions: "Conversions", clicks: "Clicks",
    };
    const formatter = (value: number) => seriesMetric === "revenue" || seriesMetric === "spend" ? fmtUSD(value) : fmtCount(value);
    const trendTotals = timeSeries.reduce((result, day) => result + day[valueKey], 0);
    return (
      <>
        <div className="section-lead">
          <div><span className="eyebrow">Daily performance</span><h2>See the shape of the spend.</h2></div>
          <p>Move through the filtered period and spot momentum shifts across your paid social activity.</p>
        </div>
        {filteredRows.length === 0 ? <NoRows /> : (
          <>
            <div className="series-summary">
              <div><span className="eyebrow">Selected metric total</span><strong>{formatter(trendTotals)}</strong></div>
              <div><span className="eyebrow">Daily observations</span><strong>{fmtCount(timeSeries.length)}</strong></div>
              <label className="metric-picker"><span>Trend metric</span><select value={seriesMetric} onChange={(event) => setSeriesMetric(event.target.value as typeof seriesMetric)} data-testid="select-series-metric">
                <option value="revenue">Revenue · USD</option><option value="spend">Spend · USD</option><option value="conversions">Conversions</option><option value="clicks">Clicks</option>
              </select></label>
            </div>
            <ChartCard title={`${valueTitle[seriesMetric]} by day`} description="Daily totals · dates use local calendar labels" data={timeSeries} filename={`daily-${seriesMetric}.csv`} className="time-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 14, right: 18, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="seriesWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45a894" stopOpacity={0.24} /><stop offset="100%" stopColor="#45a894" stopOpacity={0.015} /></linearGradient></defs>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} tick={chartAxis} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(value) => seriesMetric === "revenue" || seriesMetric === "spend" ? fmtUSD(value, true) : fmtCount(value)} tick={chartAxis} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatter(value), valueTitle[seriesMetric]]} labelFormatter={(label) => dateLabel(String(label))} />
                  <Area type="monotone" dataKey={valueKey} name={valueTitle[seriesMetric]} stroke="#45a894" fill="url(#seriesWash)" strokeWidth={2.4} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Conversions & clicks" description="Daily response volume · counts" data={timeSeries} filename="daily-conversions-and-clicks.csv" className="time-chart-secondary">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 12, right: 14, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dateLabel} tick={chartAxis} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={chartAxis} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [fmtCount(value), name]} labelFormatter={(label) => dateLabel(String(label))} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#3978c5" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="conversions" name="Conversions" stroke="#d69b53" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </>
    );
  }

  const hasFilters = filters.channel !== "all" || filters.audience !== "all" || filters.goal !== "all" ||
    (filters.from !== dateBounds.min && Boolean(filters.from)) || (filters.to !== dateBounds.max && Boolean(filters.to));

  return (
    <div className={`dashboard-shell ${isDark ? "theme-dark" : ""}`} data-testid="social-campaign-dashboard">
      <aside className="sidebar print:hidden">
        <div className="brand-lockup">
          <div className="brand-symbol"><span /><span /><span /></div>
          <div><strong>Signal / Social</strong><small>PERFORMANCE STUDIO</small></div>
        </div>
        <div className="workspace-chip"><span className="workspace-avatar">M</span><span><strong>Marketing team</strong><small>Workspace</small></span><ChevronDown size={14} /></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Dashboard views">
          {NAV_ITEMS.map(({ label, icon: Icon, eyebrow }) => (
            <button key={label} type="button" onClick={() => setView(label)} className={`nav-item ${view === label ? "nav-item-active" : ""}`} aria-current={view === label ? "page" : undefined} data-testid={`nav-${label.toLowerCase().replaceAll(" ", "-")}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span><small>{eyebrow}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-foot">
          <div className="data-health"><span className={`health-dot ${sourceError && !isLocalFile ? "health-error" : ""}`} /><div><strong>{isLocalFile ? "Local CSV" : "Sample data"}</strong><small>{fmtCount(rows.length)} daily records</small></div></div>
          <div className="sidebar-foot-note">PAID SOCIAL · 2026</div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Marketing</span><span className="crumb-sep">/</span><strong>{view}</strong></div>
          <div className="header-actions print:hidden">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleUpload} data-testid="input-upload-csv" />
            <button type="button" className="button-quiet upload-button" onClick={() => fileInputRef.current?.click()} disabled={isParsing} data-testid="button-upload-csv">
              {isParsing ? <RefreshCw size={15} className="spin" /> : <FileUp size={15} />}<span>{isParsing ? "Reading file…" : "Upload CSV"}</span>
            </button>
            {isLocalFile && <button type="button" className="button-quiet reset-sample" onClick={resetToSample} data-testid="button-reset-sample"><X size={14} />Reset sample</button>}
            <div className="refresh-wrap" ref={dropdownRef}>
              <div className="refresh-split">
                <button type="button" onClick={handleRefresh} disabled={loading || isLocalFile} data-testid="button-refresh">
                  <RefreshCw size={14} className={isSpinning ? "spin" : ""} />Refresh
                </button>
                <i />
                <button type="button" aria-label="Refresh settings" onClick={() => setRefreshMenuOpen((open) => !open)} data-testid="button-refresh-settings"><ChevronDown size={14} /></button>
              </div>
              {refreshMenuOpen && <div className="refresh-popover" data-testid="refresh-menu">
                <div className="popover-heading">Refresh schedule</div>
                <label className="auto-toggle"><span><strong>Auto-refresh</strong><small>Keep sample data current</small></span><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} data-testid="toggle-auto-refresh" /></label>
                <div className="popover-divider" />
                {INTERVAL_OPTIONS.map((option) => (
                  <button type="button" className="interval-option" key={option.ms} onClick={() => setIntervalMs(option.ms)} data-testid={`interval-${option.label.toLowerCase().replaceAll(" ", "-")}`}>
                    <span>{option.label}</span>{intervalMs === option.ms && <Check size={14} />}
                  </button>
                ))}
              </div>}
            </div>
            <span className="action-divider" />
            <IconButton label="Export as PDF" onClick={() => window.print()}><Printer size={15} /></IconButton>
            <IconButton label="Toggle dark mode" onClick={() => setIsDark((dark) => !dark)}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</IconButton>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="heading-overline"><span className="live-indicator" />CAMPAIGN INTELLIGENCE <span className="heading-slash">/</span> {view.toUpperCase()}</div>
              <h1>{view === "Overview" ? <>Performance, <em>in focus.</em></> : view === "Platform Comparison" ? <>The channel <em>scorecard.</em></> : view === "Campaign Details" ? <>Campaigns, <em>unpacked.</em></> : <>Trends tell <em>the story.</em></>}</h1>
              <p className="page-description">{view === "Overview" ? "A clear read on what your paid social investment is returning." : view === "Platform Comparison" ? "See which platforms are earning their share of the budget." : view === "Campaign Details" ? "Sort and search campaign totals across daily performance." : "Daily outcomes across your selected campaign window."}</p>
            </div>
            <div className="heading-meta"><span className="data-source-tag"><span className="tag-dot" />{isLocalFile ? uploadName : "SAMPLE DATA"}</span><span className="last-updated">{lastRefreshed ? `Updated ${lastRefreshed}` : "Bundled campaign sample"}</span></div>
          </div>

          {uploadError && <div className="alert-banner" role="alert" data-testid="upload-error"><CircleAlert size={17} /><div><strong>Could not use this CSV</strong><span>{uploadError}</span></div><button type="button" aria-label="Dismiss upload error" onClick={() => setUploadError("")}><X size={15} /></button></div>}
          {sourceError && !isLocalFile && !loading && <div className="alert-banner source-alert" role="alert" data-testid="source-error"><CircleAlert size={17} /><div><strong>Campaign data unavailable</strong><span>{sourceError instanceof Error ? sourceError.message : "The sample could not be loaded. Check your connection and try again."}</span></div><button type="button" onClick={() => void query.refetch()} data-testid="button-retry">Try again</button></div>}

          <section className="filter-bar print:hidden" aria-label="Shared campaign filters">
            <div className="filter-label"><span className="filter-icon"><ArrowDownWideNarrow size={15} /></span><span>FILTERS</span>{hasFilters && <span className="filter-count">ACTIVE</span>}</div>
            <div className="filter-field date-filter"><label htmlFor="filter-from">Date range</label><div className="date-range-controls"><input id="filter-from" aria-label="Start date" type="date" value={filters.from} min={dateBounds.min} max={filters.to || dateBounds.max} onChange={(event) => setFilter("from", event.target.value)} data-testid="filter-date-from" /><span>—</span><input aria-label="End date" type="date" value={filters.to} min={filters.from || dateBounds.min} max={dateBounds.max} onChange={(event) => setFilter("to", event.target.value)} data-testid="filter-date-to" /></div></div>
            <FilterSelect label="Channel" value={filters.channel} options={options.channels} onChange={(value) => setFilter("channel", value)} testId="filter-channel" />
            <FilterSelect label="Audience" value={filters.audience} options={options.audiences} onChange={(value) => setFilter("audience", value)} testId="filter-audience" />
            <FilterSelect label="Campaign goal" value={filters.goal} options={options.goals} onChange={(value) => setFilter("goal", value)} testId="filter-goal" />
            {hasFilters && <button type="button" className="clear-filters" onClick={clearFilters} data-testid="button-clear-filters"><X size={13} />Clear</button>}
            <span className="filter-result-count" data-testid="filter-result-count">{filteredRows.length.toLocaleString()} rows</span>
          </section>

          {loading ? <DashboardSkeleton /> : sourceError && !isLocalFile && rows.length === 0 ? (
            <div className="fatal-state"><div className="empty-glyph"><CircleAlert size={21} /></div><h2>We couldn’t load the campaign sample.</h2><p>Try refreshing, or upload a campaign CSV to continue.</p><button type="button" className="button-primary" onClick={() => void query.refetch()}><RefreshCw size={14} />Retry connection</button></div>
          ) : rows.length === 0 ? (
            <div className="fatal-state"><div className="empty-glyph"><BarChart3 size={21} /></div><h2>No campaign rows yet.</h2><p>Upload a valid CSV with daily campaign data to see your performance.</p><button type="button" className="button-primary" onClick={() => fileInputRef.current?.click()}><FileUp size={14} />Choose a CSV</button></div>
          ) : (
            <div className="view-content" key={view}>
              {view === "Overview" && renderOverview()}
              {view === "Platform Comparison" && renderPlatformComparison()}
              {view === "Campaign Details" && renderCampaignDetails()}
              {view === "Time Series" && renderTimeSeries()}
            </div>
          )}

          <footer className="page-footer"><span>Signal / Social</span><span>ROI = (revenue − spend) ÷ spend · calculated from totals</span><span>USD · {fmtCount(filteredRows.length)} daily records</span></footer>
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, testId }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; testId: string;
}) {
  return <div className="filter-field"><label>{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId}><option value="all">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function CampaignTable({ campaigns, search, setSearch, sortBy, setSortBy, compact = false }: {
  campaigns: CampaignAggregate[]; search: string; setSearch: (value: string) => void;
  sortBy: "spend" | "revenue" | "roi" | "conversions";
  setSortBy: (value: "spend" | "revenue" | "roi" | "conversions") => void;
  compact?: boolean;
}) {
  return (
    <section className="panel campaign-table-panel" data-testid="campaign-table">
      <div className="panel-head table-panel-head">
        <div><h2 className="panel-title">{compact ? "Campaign leaders" : "All campaigns"}</h2><p className="panel-subtitle">Aggregated by campaign ID · totals across filtered dates</p></div>
        <div className="table-tools">
          <label className="table-search"><Search size={15} /><input type="search" placeholder="Search campaigns…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search campaigns" data-testid="input-search-campaigns" />{search && <button type="button" aria-label="Clear campaign search" onClick={() => setSearch("")}><X size={13} /></button>}</label>
          <label className="sort-select"><span>Sort</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} data-testid="select-campaign-sort"><option value="spend">Spend</option><option value="revenue">Revenue</option><option value="roi">ROI</option><option value="conversions">Conversions</option></select></label>
        </div>
      </div>
      {campaigns.length === 0 ? <NoRows title="No matching campaigns" message="Try a different search or adjust the shared filters above." /> : (
        <div className="table-scroll">
          <table className="campaign-table">
            <thead><tr><th>Campaign</th><th>Channel</th><th>Goal</th><th className="align-right">Spend <small>USD</small></th><th className="align-right">Revenue <small>USD</small></th><th className="align-right">Conversions</th><th className="align-right">ROI</th></tr></thead>
            <tbody>{campaigns.map((campaign) => (
              <tr key={campaign.campaign_id} data-testid={`row-campaign-${campaign.campaign_id}`}>
                <td><div className="campaign-cell"><span className="campaign-monogram">{campaign.campaign_name.slice(0, 1).toUpperCase()}</span><span><strong>{campaign.campaign_name}</strong><small>{campaign.campaign_id} · {campaign.days} days</small></span></div></td>
                <td><span className="channel-pill"><i style={{ background: PLATFORM_COLORS[campaign.channel] ?? "#8d9a94" }} />{campaign.channel}</span></td>
                <td><span className="goal-label">{campaign.campaign_goal}</span></td>
                <td className="align-right numeric-cell">{fmtUSD(campaign.spend)}</td>
                <td className="align-right numeric-cell revenue-cell">{fmtUSD(campaign.revenue)}</td>
                <td className="align-right numeric-cell">{fmtCount(campaign.conversions)}</td>
                <td className={`align-right numeric-cell roi-cell ${campaign.roi < 0 ? "negative" : ""}`}>{fmtPct(campaign.roi)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="table-foot"><span>Showing <strong>{campaigns.length}</strong> campaign{campaigns.length === 1 ? "" : "s"}</span><span>Clicks: <strong>{fmtCount(campaigns.reduce((sum, item) => sum + item.clicks, 0))}</strong> · Conversion rate: <strong>{fmtPct(campaigns.reduce((sum, item) => sum + item.clicks, 0) ? campaigns.reduce((sum, item) => sum + item.conversions, 0) / campaigns.reduce((sum, item) => sum + item.clicks, 0) * 100 : 0)}</strong></span></div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="skeleton-view" aria-label="Loading campaign dashboard" data-testid="dashboard-loading">
      <div className="metric-grid">{[0, 1, 2, 3].map((item) => <div className="skeleton-metric" key={item}><i /><b /><small /></div>)}</div>
      <div className="chart-grid"><div className="skeleton-chart" /><div className="skeleton-chart" /></div>
      <div className="skeleton-table"><i /><i /><i /><i /></div>
    </div>
  );
}

export default SocialCampaignDashboard;
