import { useEffect, useMemo, useState } from "react";
import { format, subDays, parseISO, eachDayOfInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, Droplets, Stethoscope, Wheat, Download, Printer, Share2, Trophy, ArrowDownCircle } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exportMilkCSV, exportHealthCSV } from "@/lib/exports";
import { downloadMilkPDF } from "@/lib/pdfReport";
import { toast } from "sonner";

type Range = { from: string; to: string };

const defaultRange = (): Range => ({
  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd"),
});

const Reports = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>(defaultRange());
  const [milk, setMilk] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [cows, setCows] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [m, h, f, c] = await Promise.all([
        supabase.from("milk_records").select("*").eq("user_id", user.id).gte("record_date", range.from).lte("record_date", range.to),
        supabase.from("health_records").select("*").eq("user_id", user.id).gte("record_date", range.from).lte("record_date", range.to),
        supabase.from("feed_records").select("*").eq("user_id", user.id).gte("record_date", range.from).lte("record_date", range.to),
        supabase.from("cows").select("id, name, tag, photo_url").eq("user_id", user.id),
      ]);
      setMilk(m.data ?? []);
      setHealth(h.data ?? []);
      setFeed(f.data ?? []);
      setCows(new Map((c.data ?? []).map((x) => [x.id, x])));
    })();
  }, [user, range]);

  const days = useMemo(
    () => eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) }).map((d) => format(d, "yyyy-MM-dd")),
    [range],
  );

  const milkSeries = useMemo(() => {
    const map = new Map(days.map((d) => [d, 0]));
    for (const r of milk) map.set(r.record_date, (map.get(r.record_date) ?? 0) + Number(r.total_litres ?? 0));
    return Array.from(map.entries()).map(([date, litres]) => ({ date, litres: +litres.toFixed(1) }));
  }, [days, milk]);

  const milkTotal = milkSeries.reduce((s, p) => s + p.litres, 0);
  const milkAvg = milkSeries.length ? milkTotal / milkSeries.length : 0;
  const milkPeak = milkSeries.reduce((a, b) => (b.litres > a.litres ? b : a), { date: "", litres: 0 });

  // Yesterday vs today delta (last two days in series)
  const todayPt = milkSeries[milkSeries.length - 1];
  const yestPt = milkSeries[milkSeries.length - 2];
  const dayDelta = todayPt && yestPt ? todayPt.litres - yestPt.litres : 0;
  const dayPct = yestPt && yestPt.litres > 0 ? (dayDelta / yestPt.litres) * 100 : 0;

  const milkByCow = useMemo(() => {
    const m = new Map<string, { litres: number; am: number; noon: number; pm: number; days: Set<string> }>();
    for (const r of milk) {
      const cur = m.get(r.cow_id) ?? { litres: 0, am: 0, noon: 0, pm: 0, days: new Set<string>() };
      const am = Number(r.am_litres ?? 0);
      const noon = Number(r.noon_litres ?? 0);
      const pm = Number(r.pm_litres ?? 0);
      cur.am += am;
      cur.noon += noon;
      cur.pm += pm;
      cur.litres += Number(r.total_litres ?? am + noon + pm);
      cur.days.add(r.record_date);
      m.set(r.cow_id, cur);
    }
    return Array.from(m.entries())
      .map(([cow_id, v]) => {
        const cow = cows.get(cow_id);
        return {
          cow_id,
          name: cow?.name ?? "Unknown",
          tag: cow?.tag ?? null,
          photo: cow?.photo_url ?? null,
          litres: +v.litres.toFixed(1),
          am: +v.am.toFixed(1),
          noon: +v.noon.toFixed(1),
          pm: +v.pm.toFixed(1),
          days: v.days.size,
          avg: +(v.litres / Math.max(1, v.days.size)).toFixed(1),
        };
      })
      .sort((a, b) => b.litres - a.litres);
  }, [milk, cows]);

  // Herd-wide session totals
  const herdTotals = useMemo(() => {
    const t = milkByCow.reduce(
      (s, c) => ({ am: s.am + c.am, noon: s.noon + c.noon, pm: s.pm + c.pm, total: s.total + c.litres }),
      { am: 0, noon: 0, pm: 0, total: 0 },
    );
    return { am: +t.am.toFixed(1), noon: +t.noon.toFixed(1), pm: +t.pm.toFixed(1), total: +t.total.toFixed(1) };
  }, [milkByCow]);

  const top3 = milkByCow.slice(0, 3);
  const bottom3 = milkByCow.length > 3 ? milkByCow.slice(-3).reverse() : [];

  const shareWhatsApp = () => {
    const lines = [
      `🐄 *Kibet Farm Yard — Milk Report*`,
      `${format(parseISO(range.from), "d MMM")} → ${format(parseISO(range.to), "d MMM yyyy")}`,
      ``,
      `Total: *${milkTotal.toFixed(1)} L* · Avg: ${milkAvg.toFixed(1)} L/day`,
      `Herd sessions — M: ${herdTotals.am} · N: ${herdTotals.noon} · E: ${herdTotals.pm}`,
      ``,
      `*Top producers*`,
      ...top3.map((c, i) => `${i + 1}. ${c.name} — ${c.litres.toFixed(1)} L (${c.avg}/day)`),
    ];
    if (bottom3.length) {
      lines.push("", "*Needs Attention*");
      bottom3.forEach((c, i) => lines.push(`${i + 1}. ${c.name} — ${c.litres.toFixed(1)} L`));
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const feedByType = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of feed) m.set(f.feed_type, (m.get(f.feed_type) ?? 0) + Number(f.quantity_kg ?? 0));
    return Array.from(m.entries()).map(([feed_type, kg]) => ({ feed_type, kg: +kg.toFixed(1) })).sort((a, b) => b.kg - a.kg);
  }, [feed]);

  const feedTotalKg = feedByType.reduce((s, x) => s + x.kg, 0);

  const healthByKind = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of health) m.set(h.kind, (m.get(h.kind) ?? 0) + 1);
    return Array.from(m.entries()).map(([kind, count]) => ({ kind, count }));
  }, [health]);

  const setPreset = (days: number) =>
    setRange({ from: format(subDays(new Date(), days - 1), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Milk, health and feed insights for any date range.</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => shareWhatsApp()}>
            <Share2 className="w-4 h-4 mr-1.5" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await downloadMilkPDF({
                  range,
                  totals: { total: milkTotal, avg: milkAvg, peak: milkPeak },
                  herd: herdTotals,
                  cows: milkByCow,
                  series: milkSeries,
                });
                toast.success("PDF downloaded");
              } catch (e: any) {
                toast.error("Could not generate PDF");
              }
            }}
          >
            <Printer className="w-4 h-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="farm-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="mt-1.5 w-44" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={range.to} min={range.from} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setRange({ ...range, to: e.target.value })} className="mt-1.5 w-44" />
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPreset(d)}
              className="px-3 h-9 rounded-full text-xs font-medium border border-border bg-card hover:bg-secondary transition-colors"
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="milk">
        <TabsList className="w-full">
          <TabsTrigger value="milk" className="flex-1"><Droplets className="w-4 h-4 mr-1.5" /> Milk</TabsTrigger>
          <TabsTrigger value="health" className="flex-1"><Stethoscope className="w-4 h-4 mr-1.5" /> Health</TabsTrigger>
          <TabsTrigger value="feed" className="flex-1"><Wheat className="w-4 h-4 mr-1.5" /> Feed</TabsTrigger>
        </TabsList>

        {/* MILK */}
        <TabsContent value="milk" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total" value={`${milkTotal.toFixed(0)} L`} />
            <Stat label="Daily avg" value={`${milkAvg.toFixed(1)} L`} />
            <Stat label="Peak day" value={milkPeak.litres ? `${milkPeak.litres.toFixed(0)} L` : "—"} sub={milkPeak.date ? format(parseISO(milkPeak.date), "d MMM") : ""} />
            <Stat
              label="Today vs Yesterday"
              value={yestPt && yestPt.litres > 0 ? `${dayDelta >= 0 ? "▲" : "▼"} ${Math.abs(dayPct).toFixed(0)}%` : "—"}
              sub={todayPt ? `${todayPt.litres.toFixed(1)} L today` : ""}
            />
          </div>
          <div className="farm-card p-4">
            <div className="h-56 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={milkSeries} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rmilk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), "d MMM")} minTickGap={28} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} labelFormatter={(v) => format(parseISO(v as string), "EEE, d MMM")} formatter={(v: number) => [`${v} L`, "Milk"]} />
                  <Area type="monotone" dataKey="litres" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rmilk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={async () => { if (user) (await exportMilkCSV(user.id)) ? toast.success("Milk CSV downloaded") : toast.message("No milk records"); }}>
            <Download className="w-4 h-4 mr-2" /> Export milk CSV
          </Button>

          {/* Top / Bottom 3 */}
          {milkByCow.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="farm-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-sm">Top 3 producers</h3>
                </div>
                <div className="space-y-2">
                  {top3.map((c, i) => (
                    <div key={c.cow_id} className="flex items-center justify-between text-sm">
                      <span className="truncate"><span className="font-mono text-muted-foreground mr-2">{i + 1}.</span>{c.name}</span>
                      <span className="font-display font-semibold text-primary">{c.litres.toFixed(0)} L</span>
                    </div>
                  ))}
                </div>
              </div>
              {bottom3.length > 0 && (
                <div className="farm-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDownCircle className="w-4 h-4 text-destructive" />
                    <h3 className="font-display font-semibold text-sm">Needs Attention</h3>
                  </div>
                  <div className="space-y-2">
                    {bottom3.map((c, i) => (
                      <div key={c.cow_id} className="flex items-center justify-between text-sm">
                        <span className="truncate"><span className="font-mono text-muted-foreground mr-2">{i + 1}.</span>{c.name}</span>
                        <span className="font-display font-semibold text-destructive">{c.litres.toFixed(0)} L</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="farm-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">Production by cow</h3>
              <span className="text-xs text-muted-foreground">{milkByCow.length} cow{milkByCow.length === 1 ? "" : "s"}</span>
            </div>
            {milkByCow.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No milk recorded in this range.</div>
            ) : (
              <div className="divide-y divide-border">
                {milkByCow.map((c, i) => {
                  const pct = milkByCow[0].litres > 0 ? (c.litres / milkByCow[0].litres) * 100 : 0;
                  return (
                    <div key={c.cow_id} className="p-3 flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-mono text-muted-foreground">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-medium text-sm truncate">{c.name}{c.tag && <span className="text-muted-foreground ml-1">#{c.tag}</span>}</div>
                          <div className="font-display font-semibold text-sm text-primary whitespace-nowrap">{c.litres.toFixed(0)} L</div>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[11px]">
                          <SessionPill label="M" value={c.am} />
                          <SessionPill label="N" value={c.noon} />
                          <SessionPill label="E" value={c.pm} />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{c.avg} L/day · {c.days} day{c.days === 1 ? "" : "s"} milked</div>
                      </div>
                    </div>
                  );
                })}
                {/* Totals row */}
                <div className="p-3 bg-secondary/40 flex items-center gap-3">
                  <div className="w-6" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display font-bold text-sm">Herd total</div>
                      <div className="font-display font-bold text-sm text-primary whitespace-nowrap">{herdTotals.total.toFixed(0)} L</div>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[11px]">
                      <SessionPill label="M" value={herdTotals.am} />
                      <SessionPill label="N" value={herdTotals.noon} />
                      <SessionPill label="E" value={herdTotals.pm} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* HEALTH */}
        <TabsContent value="health" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total events" value={String(health.length)} />
            <Stat label="Vaccinations" value={String(health.filter((h) => h.kind === "vaccination").length)} />
            <Stat label="Treatments" value={String(health.filter((h) => h.kind === "treatment").length)} />
          </div>
          <div className="farm-card p-4">
            <div className="h-56 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthByKind}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="kind" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="farm-card divide-y divide-border">
            {health.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No health records in this range.</div>
            ) : (
              health.slice(0, 20).map((h) => (
                <div key={h.id} className="p-3 text-sm flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium capitalize">{String(h.kind).replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">{cows.get(h.cow_id)?.name ?? "—"} · {h.description ?? ""}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{h.record_date}</div>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={async () => { if (user) (await exportHealthCSV(user.id)) ? toast.success("Health CSV downloaded") : toast.message("No health records"); }}>
            <Download className="w-4 h-4 mr-2" /> Export health CSV
          </Button>
        </TabsContent>

        {/* FEED */}
        <TabsContent value="feed" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total feed" value={`${feedTotalKg.toFixed(0)} kg`} />
            <Stat label="Records" value={String(feed.length)} />
            <Stat label="Top ration" value={feedByType[0]?.feed_type ?? "—"} sub={feedByType[0] ? `${feedByType[0].kg.toFixed(0)} kg` : ""} />
          </div>
          <div className="farm-card p-4">
            <div className="h-56 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feedByType} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="feed_type" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v} kg`, "Quantity"]} />
                  <Bar dataKey="kg" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {feed.length === 0 && (
            <div className="farm-card p-6 text-center text-sm text-muted-foreground">No feed (TMR) records in this range.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="farm-card p-4">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="font-display text-xl font-bold mt-1">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const SessionPill = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between rounded-md bg-secondary/60 px-2 py-1">
    <span className="font-mono text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums">{value.toFixed(1)}</span>
  </div>
);

export default Reports;