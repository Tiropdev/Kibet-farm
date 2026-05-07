import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildAlerts, FarmAlert, todayISO } from "@/lib/farm";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { AlertPill } from "@/components/farm/AlertBadge";
import { Button } from "@/components/ui/button";
import { Beef, HeartPulse, CalendarClock, AlertTriangle, Plus, Droplets, ArrowRight, ListChecks, CalendarDays, Trophy, TrendingUp, TrendingDown, Wheat, Stethoscope, BarChart3, Sparkles } from "lucide-react";
import { MilkChart } from "@/components/farm/MilkChart";
import { HealthChart } from "@/components/farm/HealthChart";
import { CountUp } from "@/components/farm/CountUp";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  total: number;
  pregnant: number;
  dueSoon: number;
  attention: number;
  todayMilk: number;
  yesterdayMilk: number;
  weekMilk: number;
  weekFeedKg: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ total: 0, pregnant: 0, dueSoon: 0, attention: 0, todayMilk: 0, yesterdayMilk: 0, weekMilk: 0, weekFeedKg: 0 });
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [topProducers, setTopProducers] = useState<{ id: string; name: string; photo: string | null; litres: number }[]>([]);
  const [bestEfficiency, setBestEfficiency] = useState<{ name: string; ratio: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = todayISO();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const [cows, breeding, milk, milkToday, milkYesterday, milkWeek, feedWeek, milkWeekByCow, feedWeekByCow] = await Promise.all([
        supabase.from("cows").select("id, status").eq("user_id", user.id),
        supabase.from("breeding_records").select("expected_due_date").eq("user_id", user.id),
        supabase.from("milk_records").select("total_litres").eq("user_id", user.id).eq("record_date", today),
        supabase
          .from("milk_records")
          .select("total_litres, cow_id, cows(id, name, photo_url)")
          .eq("user_id", user.id)
          .eq("record_date", today),
        supabase.from("milk_records").select("total_litres").eq("user_id", user.id).eq("record_date", yesterday),
        supabase.from("milk_records").select("total_litres").eq("user_id", user.id).gte("record_date", weekAgo),
        supabase.from("feed_records").select("quantity_kg").eq("user_id", user.id).gte("record_date", weekAgo),
        supabase.from("milk_records").select("cow_id, total_litres, cows(name)").eq("user_id", user.id).gte("record_date", weekAgo),
        supabase.from("feed_records").select("cow_id, quantity_kg").eq("user_id", user.id).gte("record_date", weekAgo),
      ]);
      const cowList = cows.data ?? [];
      const dueSoon = (breeding.data ?? []).filter((b) => {
        if (!b.expected_due_date) return false;
        const d = new Date(b.expected_due_date).getTime() - Date.now();
        return d >= 0 && d <= 14 * 86400000;
      }).length;
      const todayMilk = (milk.data ?? []).reduce((s, r) => s + Number(r.total_litres ?? 0), 0);
      const yesterdayMilk = (milkYesterday.data ?? []).reduce((s, r) => s + Number(r.total_litres ?? 0), 0);
      const weekMilk = (milkWeek.data ?? []).reduce((s, r) => s + Number(r.total_litres ?? 0), 0);
      const weekFeedKg = (feedWeek.data ?? []).reduce((s, r) => s + Number(r.quantity_kg ?? 0), 0);

      // Per-cow Feed Conversion Ratio (kg TMR per litre milk) — lower is better
      const milkPerCow = new Map<string, { name: string; litres: number }>();
      for (const row of (milkWeekByCow.data ?? []) as any[]) {
        const prev = milkPerCow.get(row.cow_id) ?? { name: row.cows?.name ?? "Cow", litres: 0 };
        prev.litres += Number(row.total_litres ?? 0);
        milkPerCow.set(row.cow_id, prev);
      }
      const feedPerCow = new Map<string, number>();
      for (const row of (feedWeekByCow.data ?? []) as any[]) {
        feedPerCow.set(row.cow_id, (feedPerCow.get(row.cow_id) ?? 0) + Number(row.quantity_kg ?? 0));
      }
      let best: { name: string; ratio: number } | null = null;
      for (const [cowId, m] of milkPerCow.entries()) {
        const f = feedPerCow.get(cowId) ?? 0;
        if (m.litres < 5 || f < 1) continue;
        const ratio = f / m.litres;
        if (!best || ratio < best.ratio) best = { name: m.name, ratio };
      }
      setBestEfficiency(best);

      const a = await buildAlerts(user.id);
      setAlerts(a);
      setStats({
        total: cowList.length,
        pregnant: cowList.filter((c) => c.status === "pregnant").length,
        dueSoon,
        attention: a.filter((x) => x.level === "urgent").length,
        todayMilk,
        yesterdayMilk,
        weekMilk,
        weekFeedKg,
      });
      const byCow = new Map<string, { id: string; name: string; photo: string | null; litres: number }>();
      for (const row of (milkToday.data ?? []) as any[]) {
        if (!row.cow_id || !row.cows) continue;
        const prev = byCow.get(row.cow_id);
        const litres = Number(row.total_litres ?? 0);
        if (prev) {
          prev.litres += litres;
        } else {
          byCow.set(row.cow_id, {
            id: row.cow_id,
            name: row.cows.name,
            photo: row.cows.photo_url ?? null,
            litres,
          });
        }
      }
      setTopProducers(
        Array.from(byCow.values()).sort((x, y) => y.litres - x.litres).slice(0, 5),
      );
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { label: "Total Cows", value: stats.total, icon: Beef, tone: "bg-primary-soft text-primary", to: "/cows" },
    { label: "Date Of Service", value: stats.pregnant, icon: HeartPulse, tone: "bg-accent text-accent-foreground", to: "/cows?status=pregnant" },
    { label: "Due Date (≤14d)", value: stats.dueSoon, icon: CalendarClock, tone: "bg-warning/15 text-warning-foreground", to: "/calendar" },
    { label: "Needs Attention", value: stats.attention, icon: AlertTriangle, tone: "bg-destructive/10 text-destructive", to: "/alerts" },
  ];

  const milkDelta = stats.todayMilk - stats.yesterdayMilk;
  const milkPct = stats.yesterdayMilk > 0 ? (milkDelta / stats.yesterdayMilk) * 100 : 0;
  const insights = [
    {
      icon: milkDelta >= 0 ? TrendingUp : TrendingDown,
      tone: milkDelta >= 0 ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive",
      label: "vs Yesterday",
      value: stats.yesterdayMilk > 0 ? `${milkDelta >= 0 ? "+" : ""}${milkPct.toFixed(0)}%` : "—",
      sub: `${stats.todayMilk.toFixed(1)} L today`,
      to: "/reports",
    },
    {
      icon: Droplets,
      tone: "bg-accent text-accent-foreground",
      label: "7-Day Milk",
      value: `${stats.weekMilk.toFixed(0)} L`,
      sub: `${(stats.weekMilk / 7).toFixed(1)} L/day avg`,
      to: "/reports",
    },
    {
      icon: Wheat,
      tone: "bg-warning/15 text-warning-foreground",
      label: "TMR (7-day)",
      value: `${stats.weekFeedKg.toFixed(0)} kg`,
      sub: stats.weekMilk > 0 ? `${(stats.weekFeedKg / stats.weekMilk).toFixed(2)} kg/L` : "Feed efficiency",
      to: "/reports",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Karibu Kibet Farm 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's What Needs Your Attention Today.</p>
        </div>
        <Button onClick={() => navigate("/add")} className="hidden md:flex h-11 rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Add Record
        </Button>
      </div>

      {/* Weekly summary banner */}
      {!loading && stats.total > 0 && (
        <div className="rounded-2xl p-5 bg-gradient-hero text-primary-foreground shadow-elevated animate-fade-in">
          <div className="text-xs uppercase tracking-wider opacity-80">This Week At A Glance</div>
          <div className="mt-1 font-display text-lg md:text-xl font-semibold leading-snug">
            {stats.weekMilk.toFixed(0)} L milk · {stats.total} cow{stats.total === 1 ? "" : "s"} · {alerts.length} alert{alerts.length === 1 ? "" : "s"}
            {topProducers[0] && ` · ${topProducers[0].name} leading 🏆`}
          </div>
          <div className="text-sm opacity-90 mt-1">
            Avg {(stats.weekMilk / 7).toFixed(1)} L/day{stats.weekMilk > 0 && ` · ${(stats.weekFeedKg / stats.weekMilk).toFixed(2)} kg TMR per L`}
          </div>
          {bestEfficiency && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white/15 px-2.5 py-1 rounded-full backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              Most Efficient: <strong>{bestEfficiency.name}</strong> · {bestEfficiency.ratio.toFixed(2)} kg/L
            </div>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.to)}
            className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tone} group-hover:scale-110 transition-transform`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="mt-3 text-2xl font-display font-bold"><CountUp value={c.value} /></div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{c.label} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
          </button>
        ))}
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : insights.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.to)}
            className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.tone} group-hover:scale-110 transition-transform`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="mt-3 font-display text-xl font-bold">{c.value}</div>
            <div className="text-[11px] text-muted-foreground">{c.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
          </button>
        ))}
      </div>

      {/* Today's Milk */}
      <div className="farm-card p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Today's Milk</div>
            <div className="font-display text-2xl font-bold"><CountUp value={stats.todayMilk} decimals={1} /> <span className="text-sm font-normal text-muted-foreground">litres</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/add?type=milk")} size="sm">Single</Button>
          <Button onClick={() => navigate("/milk/bulk")} size="sm"><ListChecks className="w-4 h-4 mr-1" /> Bulk Entry</Button>
        </div>
      </div>

      {/* Production chart */}
      <MilkChart />

      {/* Health chart */}
      <HealthChart />

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => navigate("/calendar")} className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center group-hover:scale-110 transition-transform"><CalendarDays className="w-5 h-5" /></div>
          <div className="font-display font-semibold mt-3">Calendar</div>
          <div className="text-xs text-muted-foreground">Upcoming Events</div>
        </button>
        <button onClick={() => navigate("/reports")} className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center group-hover:scale-110 transition-transform"><BarChart3 className="w-5 h-5" /></div>
          <div className="font-display font-semibold mt-3">Reports</div>
          <div className="text-xs text-muted-foreground">Trends &amp; Analysis</div>
        </button>
        <button onClick={() => navigate("/milk/bulk")} className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center group-hover:scale-110 transition-transform"><Droplets className="w-5 h-5" /></div>
          <div className="font-display font-semibold mt-3">Bulk Milk</div>
          <div className="text-xs text-muted-foreground">Daily Entry</div>
        </button>
        <button onClick={() => navigate("/alerts")} className="farm-card p-4 text-left hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center group-hover:scale-110 transition-transform"><AlertTriangle className="w-5 h-5" /></div>
          <div className="font-display font-semibold mt-3">Alerts</div>
          <div className="text-xs text-muted-foreground">{alerts.length} active</div>
        </button>
      </div>

      {/* Alerts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Alerts</h2>
          <Link to="/alerts" className="text-sm text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {alerts.length === 0 ? (
          <div className="farm-card p-6 text-center text-sm text-muted-foreground">All Clear — No Alerts Right Now.</div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <Link key={a.id} to={`/cows/${a.cow_id}`} className="farm-card p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                <CowAvatar src={a.cow_photo} name={a.cow_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{a.cow_name}</span>
                    <AlertPill level={a.level}>{a.level}</AlertPill>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{a.message}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top Producers Today */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Top Producers Today
          </h2>
          <Link to="/milk/bulk" className="text-sm text-primary hover:underline flex items-center gap-1">
            Record Milk <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {topProducers.length === 0 ? (
          <div className="farm-card p-6 text-center text-sm text-muted-foreground">
            No milk recorded yet today.
          </div>
        ) : (
          <div className="farm-card divide-y divide-border">
            {topProducers.map((p, i) => (
              <Link
                key={p.id}
                to={`/cows/${p.id}`}
                className="p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-7 text-center font-display font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <CowAvatar src={p.photo} name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Today's total</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold">
                    {p.litres.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">L</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;