import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { StatusBadge } from "@/components/farm/StatusBadge";
import { EmptyState } from "@/components/farm/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Beef, Plus, Search, AlertCircle } from "lucide-react";
import { CowStatus, buildAlerts } from "@/lib/farm";
import { Skeleton } from "@/components/ui/skeleton";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "lactating", label: "Milk Production" },
  { key: "pregnant", label: "Date Of Service" },
  { key: "dry", label: "Dry" },
  { key: "sick", label: "Health" },
  { key: "due", label: "Due Date" },
];

const CowsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cows, setCows] = useState<any[]>([]);
  const [alertCowIds, setAlertCowIds] = useState<Set<string>>(new Set());
  const [dueCowIds, setDueCowIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("cows").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setCows(data ?? []);
      const a = await buildAlerts(user.id);
      setAlertCowIds(new Set(a.filter((x) => x.level !== "info").map((x) => x.cow_id)));
      // due soon = breeding due in 14 days
      const { data: br } = await supabase.from("breeding_records").select("cow_id, expected_due_date").eq("user_id", user.id);
      const due = new Set<string>();
      (br ?? []).forEach((b) => {
        if (!b.expected_due_date) return;
        const d = new Date(b.expected_due_date).getTime() - Date.now();
        if (d >= 0 && d <= 14 * 86400000) due.add(b.cow_id);
      });
      setDueCowIds(due);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    return cows.filter((c) => {
      if (q && !`${c.name} ${c.tag ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "due") return dueCowIds.has(c.id);
      return c.status === filter;
    });
  }, [cows, q, filter, dueCowIds]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Cows</h1>
          <p className="text-sm text-muted-foreground mt-1">{cows.length} in your herd</p>
        </div>
        <Button onClick={() => navigate("/cows/new")} className="rounded-full"><Plus className="w-4 h-4 mr-1" /> Add Cow</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or tag…" className="pl-9 h-11 rounded-xl" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Beef className="w-7 h-7" />}
          title={cows.length === 0 ? "No cows yet" : "No matches"}
          description={cows.length === 0 ? "Add your first cow to start tracking milk, breeding and health." : "Try a different filter or search term."}
          action={cows.length === 0 ? <Button onClick={() => navigate("/cows/new")}><Plus className="w-4 h-4 mr-1" /> Add your first cow</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/cows/${c.id}`} className="farm-card p-4 flex items-center gap-3 hover:shadow-elevated transition-shadow">
              <CowAvatar src={c.photo_url} name={c.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold truncate">{c.name}</h3>
                  {c.tag && <span className="text-xs text-muted-foreground">#{c.tag}</span>}
                  {alertCowIds.has(c.id) && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.breed ?? "Breed —"}</div>
                <div className="mt-1.5"><StatusBadge status={c.status as CowStatus} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CowsList;