import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Droplets, Save } from "lucide-react";
import { logActivity, todayISO } from "@/lib/farm";
import { toast } from "sonner";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { safeUpsert } from "@/lib/offlineQueue";

interface Row {
  id: string;
  name: string;
  tag: string | null;
  photo_url: string | null;
  am: string;
  noon: string;
  pm: string;
  lockAm: boolean;
  lockNoon: boolean;
  lockPm: boolean;
  existing_id?: string;
}

const BulkMilk = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const { data: cows } = await supabase
        .from("cows")
        .select("id, name, tag, photo_url, status")
        .eq("user_id", user.id)
        .in("status", ["lactating", "pregnant"])
        .order("name");
      const { data: existing } = await supabase
        .from("milk_records")
        .select("id, cow_id, am_litres, noon_litres, pm_litres")
        .eq("user_id", user.id)
        .eq("record_date", date);
      const map = new Map((existing ?? []).map((m) => [m.cow_id, m]));
      setRows(
        (cows ?? []).map((c) => {
          const e: any = map.get(c.id);
          return {
            id: c.id,
            name: c.name,
            tag: c.tag,
            photo_url: c.photo_url,
            am: e ? String(e.am_litres) : "",
            noon: e ? String(e.noon_litres ?? 0) : "",
            pm: e ? String(e.pm_litres) : "",
            lockAm: !!e && Number(e.am_litres) > 0,
            lockNoon: !!e && Number(e.noon_litres) > 0,
            lockPm: !!e && Number(e.pm_litres) > 0,
            existing_id: e?.id,
          };
        })
      );
      setLoading(false);
    })();
  }, [user, date]);

  const update = (id: string, key: "am" | "noon" | "pm", val: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

  const total = rows.reduce((s, r) => s + (Number(r.am) || 0) + (Number(r.noon) || 0) + (Number(r.pm) || 0), 0);
  const filled = rows.filter((r) => Number(r.am) || Number(r.noon) || Number(r.pm)).length;
  const editable = rows.filter((r) => !(r.lockAm && r.lockNoon && r.lockPm));

  const saveAll = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const toUpsert = rows
        .filter((r) => !(r.lockAm && r.lockNoon && r.lockPm))
        .filter((r) => r.am !== "" || r.noon !== "" || r.pm !== "")
        .map((r) => ({
          ...(r.existing_id ? { id: r.existing_id } : {}),
          user_id: user.id,
          cow_id: r.id,
          record_date: date,
          am_litres: Number(r.am) || 0,
          noon_litres: Number(r.noon) || 0,
          pm_litres: Number(r.pm) || 0,
        }));
      if (toUpsert.length === 0) {
        toast.error("Nothing to save");
        return;
      }
      const r = await safeUpsert("milk_records", toUpsert as any, "upsert");
      await logActivity({
        user_id: user.id,
        kind: "milk",
        description: `Bulk Milk recorded for ${toUpsert.length} cows · ${total.toFixed(1)} L`,
      });
      toast.success(`${r.queued ? "Queued" : "Saved"} ${toUpsert.length} milk records`, { description: `${total.toFixed(1)} L total` });
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Droplets className="w-6 h-6 text-primary" /> Bulk Milk entry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Enter AM & PM for all milking cows at once.</p>
        </div>
      </div>

      <div className="farm-card p-4 flex flex-wrap items-end gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 w-44" />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <div className="text-xs text-muted-foreground">Filled</div>
          <div className="font-display text-xl font-bold">
            {filled} / {rows.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="font-display text-xl font-bold text-primary">{total.toFixed(1)} L</div>
        </div>
      </div>

      {loading ? (
        <div className="farm-card p-8 text-center text-sm text-muted-foreground">Loading cows…</div>
      ) : rows.length === 0 ? (
        <div className="farm-card p-8 text-center text-sm text-muted-foreground">
          No cows in milk production or service yet. Add A Cow first.
        </div>
      ) : (
        <div className="farm-card divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              <CowAvatar src={r.photo_url} name={r.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{r.name}</div>
                {r.tag && <div className="text-xs text-muted-foreground">#{r.tag}</div>}
                {r.lockAm && r.lockNoon && r.lockPm && (
                  <div className="text-[10px] text-warning-foreground">Day complete</div>
                )}
              </div>
              <Input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="AM"
                value={r.am}
                disabled={r.lockAm}
                onChange={(e) => update(r.id, "am", e.target.value)}
                className="w-16 text-center"
              />
              <Input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Noon"
                value={r.noon}
                disabled={r.lockNoon}
                onChange={(e) => update(r.id, "noon", e.target.value)}
                className="w-16 text-center"
              />
              <Input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="PM"
                value={r.pm}
                disabled={r.lockPm}
                onChange={(e) => update(r.id, "pm", e.target.value)}
                className="w-16 text-center"
              />
              <div className="w-14 text-right text-sm font-display font-semibold text-primary">
                {((Number(r.am) || 0) + (Number(r.noon) || 0) + (Number(r.pm) || 0)).toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-20 md:bottom-4 z-20 flex justify-end">
        <Button onClick={saveAll} disabled={busy || rows.length === 0} className="h-12 px-6 rounded-full shadow-elevated">
          <Save className="w-4 h-4 mr-2" /> {busy ? "Saving…" : `Save all (${filled})`}
        </Button>
      </div>
    </div>
  );
};

export default BulkMilk;
