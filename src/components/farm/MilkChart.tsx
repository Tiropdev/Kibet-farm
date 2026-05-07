import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";

interface DayPoint {
  date: string;
  litres: number;
}

export const MilkChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DayPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!user) return;
    const since = format(subDays(new Date(), 29), "yyyy-MM-dd");
    supabase
      .from("milk_records")
      .select("record_date, total_litres")
      .eq("user_id", user.id)
      .gte("record_date", since)
      .then(({ data: rows }) => {
        const buckets = new Map<string, number>();
        for (let i = 29; i >= 0; i--) {
          buckets.set(format(subDays(new Date(), i), "yyyy-MM-dd"), 0);
        }
        for (const r of rows ?? []) {
          buckets.set(r.record_date, (buckets.get(r.record_date) ?? 0) + Number(r.total_litres ?? 0));
        }
        const points: DayPoint[] = Array.from(buckets.entries()).map(([date, litres]) => ({ date, litres: +litres.toFixed(1) }));
        setData(points);
        const sum = points.reduce((s, p) => s + p.litres, 0);
        setTotal(sum);
        const nonZero = points.filter((p) => p.litres > 0).length || 1;
        setAvg(sum / nonZero);
      });
  }, [user]);

  return (
    <section className="farm-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Milk Production · last 30 days
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Daily total across the herd</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Total</div>
            <div className="font-display font-bold">{total.toFixed(0)} L</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Daily avg</div>
            <div className="font-display font-bold">{avg.toFixed(1)} L</div>
          </div>
        </div>
      </div>
      <div className="h-48 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="milkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => format(parseISO(v), "d MMM")}
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(v) => format(parseISO(v as string), "EEE, d MMM")}
              formatter={(v: number) => [`${v} L`, "Milk"]}
            />
            <Area type="monotone" dataKey="litres" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#milkFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
