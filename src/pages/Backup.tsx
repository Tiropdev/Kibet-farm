import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, FileSpreadsheet, Beef, Droplets, HeartPulse, Stethoscope, Wheat, Database, Shield } from "lucide-react";
import { exportBreedingCSV, exportCowsCSV, exportHealthCSV, exportMilkCSV } from "@/lib/exports";

const Backup = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ cows: 0, milk: 0, health: 0, breeding: 0, feed: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = (table: string) => supabase.from(table as any).select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const [c, m, h, b, f] = await Promise.all([t("cows"), t("milk_records"), t("health_records"), t("breeding_records"), t("feed_records")]);
      setCounts({ cows: c.count ?? 0, milk: m.count ?? 0, health: h.count ?? 0, breeding: b.count ?? 0, feed: f.count ?? 0 });
    })();
  }, [user]);

  const downloadJSON = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const tables = ["cows", "milk_records", "health_records", "breeding_records", "feed_records", "calves", "activity_log", "profiles"] as const;
      const dump: Record<string, unknown[]> = {};
      for (const t of tables) {
        const q = t === "profiles"
          ? await supabase.from(t).select("*").eq("id", user.id)
          : await supabase.from(t as any).select("*").eq("user_id", user.id);
        dump[t] = q.data ?? [];
      }
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), data: dump }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kibet-farm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Full backup downloaded");
    } catch (e: any) {
      toast.error(e.message ?? "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const runExport = async (fn: (uid: string) => Promise<boolean>, label: string) => {
    if (!user) return;
    const ok = await fn(user.id);
    if (ok) toast.success(`${label} downloaded`);
    else toast.message(`No ${label.toLowerCase()} to export yet`);
  };

  const exports = [
    { label: "Cows", icon: Beef, fn: exportCowsCSV, count: counts.cows },
    { label: "Milk Records", icon: Droplets, fn: exportMilkCSV, count: counts.milk },
    { label: "Health Records", icon: Stethoscope, fn: exportHealthCSV, count: counts.health },
    { label: "Breeding Records", icon: HeartPulse, fn: exportBreedingCSV, count: counts.breeding },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Settings
      </Link>
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" /> Backup &amp; Export
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Download your full farm data or per-section CSVs.</p>
      </div>

      <section className="farm-card p-5 space-y-4 bg-gradient-hero text-primary-foreground">
        <div className="flex items-start gap-3">
          <Shield className="w-8 h-8 mt-1" />
          <div className="flex-1">
            <h2 className="font-display font-semibold text-lg">Full backup (.json)</h2>
            <p className="text-sm opacity-90 mt-1">Single file with every record from your farm. Keep it safe — you can restore manually if needed.</p>
            <div className="flex flex-wrap gap-3 text-xs mt-3 opacity-90">
              <span>{counts.cows} cows</span>
              <span>· {counts.milk} milk</span>
              <span>· {counts.health} health</span>
              <span>· {counts.breeding} breeding</span>
              <span>· {counts.feed} feed</span>
            </div>
          </div>
        </div>
        <Button onClick={downloadJSON} disabled={busy} variant="secondary" size="lg" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" /> {busy ? "Preparing…" : "Download full backup"}
        </Button>
      </section>

      <section className="farm-card p-5 space-y-3">
        <div>
          <h2 className="font-display font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" /> Per-section CSV
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Opens directly in Excel or Google Sheets.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {exports.map((e) => (
            <button
              key={e.label}
              onClick={() => runExport(e.fn, e.label)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <e.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{e.label}</div>
                <div className="text-xs text-muted-foreground">{e.count} record{e.count === 1 ? "" : "s"}</div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="farm-card p-5">
        <h2 className="font-display font-semibold flex items-center gap-2 mb-2">
          <Wheat className="w-4 h-4 text-primary" /> Backup tips
        </h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Download a full backup at the end of each month.</li>
          <li>Email a copy to yourself, or save to Google Drive.</li>
          <li>CSV files open in any spreadsheet app for sharing with vets or co-ops.</li>
        </ul>
      </section>
    </div>
  );
};

export default Backup;