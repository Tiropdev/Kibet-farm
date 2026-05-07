import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildAlerts, FarmAlert, markEventCompleted } from "@/lib/farm";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { AlertPill } from "@/components/farm/AlertBadge";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { EmptyState } from "@/components/farm/EmptyState";
import { toast } from "@/hooks/use-toast";

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => user && buildAlerts(user.id).then(setAlerts);
  useEffect(() => { refresh(); }, [user]);

  const markDone = async (a: FarmAlert) => {
    if (!user || !a.source) return;
    setBusyId(a.id);
    try {
      await markEventCompleted({
        table: a.source.table,
        id: a.source.id,
        user_id: user.id,
        cow_id: a.cow_id,
        description: `Done · ${a.cow_name}: ${a.message}`,
      });
      toast({ title: "Marked as done" });
      refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const groups = [
    { key: "urgent", title: "Urgent", items: alerts.filter((a) => a.level === "urgent") },
    { key: "upcoming", title: "Upcoming", items: alerts.filter((a) => a.level === "upcoming") },
    { key: "info", title: "General", items: alerts.filter((a) => a.level === "info") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">Things that need your attention</p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon={<Bell className="w-7 h-7" />} title="All clear" description="No alerts right now. Great job staying on top of things." />
      ) : (
        <div className="space-y-6">
          {groups.map((g) =>
            g.items.length ? (
              <section key={g.key}>
                <h2 className="font-display font-semibold mb-2 flex items-center gap-2">
                  {g.title} <span className="text-xs text-muted-foreground font-normal">({g.items.length})</span>
                </h2>
                <div className="space-y-2">
                  {g.items.map((a) => (
                    <div key={a.id} className="farm-card p-3 flex items-center gap-3">
                      <CowAvatar src={a.cow_photo} name={a.cow_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{a.cow_name}</span>
                          <AlertPill level={a.level}>{a.level}</AlertPill>
                        </div>
                        <div className="text-xs text-muted-foreground">{a.message}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.source && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === a.id}
                            onClick={() => markDone(a)}
                            className="text-primary border-primary/30 hover:bg-primary-soft"
                          >
                            <Check className="w-4 h-4 mr-1" /> Done
                          </Button>
                        )}
                        <Button asChild size="sm" variant="outline"><Link to={`/cows/${a.cow_id}`}>View</Link></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default Alerts;