import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { Stethoscope } from "lucide-react";

interface DayPoint {
  date: string;
  vaccination: number;
  treatment: number;
  deworming: number;
}

export const HealthChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DayPoint[]>([]);

  useEffect(() => {
    if (!user) return;
    const since = format(subDays(new Date(), 29), "yyyy-MM-dd");
    supabase
      .from("health_records")
      .select("record_date, kind")
      .eq("user_id", user.id)
      .gte("record_date", since)
      .then(({ data: rows }) => {
        const buckets = new Map<string, DayPoint>();
        for (const d of eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })) {
          const key = format(d, "yyyy-MM-dd");
          buckets.set(key, { date: key, vaccination: 0, treatment: 0, deworming: 0 });
        }
        for (const r of rows ?? []) {
          const b = buckets.get(r.record_date);
          if (!b) continue;
          if (r.kind === "vaccination") b.vaccination += 1;
          else if (r.kind === "deworming") b.deworming += 1;
          else b.treatment += 1;
        }
        setData(Array.from(buckets.values()));
      });
  }, [user]);

  const total = data.reduce((s, p) => s + p.vaccination + p.treatment + p.deworming, 0);

  return (
    <section className="farm-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" /> Health events · last 30 days
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Vaccinations, treatments &amp; deworming</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          <div className="font-display font-bold">{total}</div>
        </div>
      </div>
      <div className="h-44 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => format(parseISO(v), "d MMM")} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} labelFormatter={(v) => format(parseISO(v as string), "EEE, d MMM")} />
            <Bar dataKey="vaccination" stackId="h" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="treatment" stackId="h" fill="hsl(var(--warning))" />
            <Bar dataKey="deworming" stackId="h" fill="hsl(var(--accent-foreground))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 text-[11px] text-muted-foreground mt-2">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary" /> Vaccination</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-warning" /> Treatment</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "hsl(var(--accent-foreground))" }} /> Deworming</span>
      </div>
    </section>
  );
};