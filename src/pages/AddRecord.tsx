import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Droplets, HeartPulse, Stethoscope, Wheat, Lock } from "lucide-react";
import { logActivity, todayISO } from "@/lib/farm";
import { toast } from "@/hooks/use-toast";
import { safeUpsert } from "@/lib/offlineQueue";

type Type = "milk" | "breeding" | "health" | "feeding";

const TYPES: { key: Type; label: string; icon: any; tone: string }[] = [
  { key: "milk", label: "Milk Production", icon: Droplets, tone: "bg-primary-soft text-primary" },
  { key: "breeding", label: "Date Of Service", icon: HeartPulse, tone: "bg-accent text-accent-foreground" },
  { key: "health", label: "Health", icon: Stethoscope, tone: "bg-warning/15 text-warning-foreground" },
  { key: "feeding", label: "Total Mixed Ratio", icon: Wheat, tone: "bg-secondary text-secondary-foreground" },
];

const AddRecord = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [type, setType] = useState<Type | null>((params.get("type") as Type) ?? null);
  const [cows, setCows] = useState<any[]>([]);
  const [cowId, setCowId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [am, setAm] = useState("0");
  const [noon, setNoon] = useState("0");
  const [pm, setPm] = useState("0");
  const [existingMilk, setExistingMilk] = useState<{ id: string; am_litres: number; noon_litres: number; pm_litres: number } | null>(null);
  const [heat, setHeat] = useState("");
  const [ins, setIns] = useState(todayISO());
  const [hKind, setHKind] = useState("vaccination");
  const [hDesc, setHDesc] = useState("");
  const [hNext, setHNext] = useState("");
  const [feedType, setFeedType] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("cows").select("id, name, tag").eq("user_id", user.id).order("name").then(({ data }) => setCows(data ?? []));
  }, [user]);

  // Load existing milk row for cow+date so we know which sessions are locked
  useEffect(() => {
    if (!user || type !== "milk" || !cowId) { setExistingMilk(null); return; }
    (supabase.from("milk_records") as any)
      .select("id, am_litres, noon_litres, pm_litres")
      .eq("user_id", user.id).eq("cow_id", cowId).eq("record_date", date)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingMilk(data);
          setAm(String(data.am_litres));
          setNoon(String(data.noon_litres ?? 0));
          setPm(String(data.pm_litres));
        } else {
          setExistingMilk(null);
          setAm("0"); setNoon("0"); setPm("0");
        }
      });
  }, [user, type, cowId, date]);

  const lockAm = !!existingMilk && Number(existingMilk.am_litres) > 0;
  const lockNoon = !!existingMilk && Number(existingMilk.noon_litres) > 0;
  const lockPm = !!existingMilk && Number(existingMilk.pm_litres) > 0;
  const allLocked = lockAm && lockNoon && lockPm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cowId || !type) return;
    setBusy(true);
    try {
      if (type === "milk") {
        if (allLocked) { toast({ title: "Already recorded", description: "All 3 sessions for this day are filled.", variant: "destructive" }); setBusy(false); return; }
        const payload: any = {
          user_id: user.id, cow_id: cowId, record_date: date,
          am_litres: Number(am) || 0, noon_litres: Number(noon) || 0, pm_litres: Number(pm) || 0,
        };
        if (existingMilk) payload.id = existingMilk.id;
        await safeUpsert("milk_records", payload, "upsert");
        const total = (Number(am) || 0) + (Number(noon) || 0) + (Number(pm) || 0);
        await logActivity({ user_id: user.id, cow_id: cowId, kind: "milk", description: `Milked ${total.toFixed(1)} L (AM/Noon/PM)` });
      } else if (type === "breeding") {
        await safeUpsert("breeding_records", { user_id: user.id, cow_id: cowId, heat_date: heat || null, insemination_date: ins || null, notes: notes || null }, "insert");
        await logActivity({ user_id: user.id, cow_id: cowId, kind: "breeding", description: "Recorded Insemination" });
      } else if (type === "health") {
        await safeUpsert("health_records", { user_id: user.id, cow_id: cowId, kind: hKind as any, description: hDesc || null, record_date: date, next_due_date: hNext || null }, "insert");
        await logActivity({ user_id: user.id, cow_id: cowId, kind: "health", description: `${hKind}: ${hDesc}`.trim() });
      } else if (type === "feeding") {
        await safeUpsert("feed_records", { user_id: user.id, cow_id: cowId, feed_type: feedType, quantity_kg: qty ? Number(qty) : null, record_date: date, notes: notes || null }, "insert");
        await logActivity({ user_id: user.id, cow_id: cowId, kind: "feeding", description: `Fed ${feedType}${qty ? ` (${qty} kg)` : ""}` });
      }
      toast({ title: "Saved" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <button onClick={() => (type ? setType(null) : navigate(-1))} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {!type && (
        <>
          <h1 className="font-display text-2xl font-bold">Add Record</h1>
          <p className="text-sm text-muted-foreground -mt-3">What Do You Want To Record?</p>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)} className="farm-card p-5 text-left hover:shadow-elevated transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${t.tone} flex items-center justify-center`}><t.icon className="w-5 h-5" /></div>
                <div className="font-display font-semibold mt-3">{t.label}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {type && (
        <form onSubmit={submit} className="farm-card p-5 space-y-4">
          <h1 className="font-display text-xl font-bold capitalize">{type} record</h1>
          <div>
            <Label>Cow *</Label>
            <Select value={cowId} onValueChange={setCowId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a cow" /></SelectTrigger>
              <SelectContent>
                {cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.tag ? ` · #${c.tag}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {type === "milk" && (<>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label className="flex items-center gap-1">AM {lockAm && <Lock className="w-3 h-3 text-muted-foreground" />}</Label>
        <Input type="number" step="0.1" value={am} disabled={lockAm} onChange={(e) => setAm(e.target.value)} className="mt-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">~6 AM</p>
      </div>
      <div>
        <Label className="flex items-center gap-1">Noon {lockNoon && <Lock className="w-3 h-3 text-muted-foreground" />}</Label>
        <Input type="number" step="0.1" value={noon} disabled={lockNoon} onChange={(e) => setNoon(e.target.value)} className="mt-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">~2 PM</p>
      </div>
      <div>
        <Label className="flex items-center gap-1">PM {lockPm && <Lock className="w-3 h-3 text-muted-foreground" />}</Label>
        <Input type="number" step="0.1" value={pm} disabled={lockPm} onChange={(e) => setPm(e.target.value)} className="mt-1.5" />
        <p className="text-[10px] text-muted-foreground mt-1">~10 PM</p>
      </div>
    </div>
    <div className="text-sm text-muted-foreground flex items-center justify-between">
      <span>Total: <span className="font-display font-semibold text-primary">{((Number(am)||0)+(Number(noon)||0)+(Number(pm)||0)).toFixed(1)} L</span></span>
      {allLocked && <span className="text-xs text-warning-foreground bg-warning/15 px-2 py-1 rounded-full">All sessions recorded for this day</span>}
    </div>
          </>)}

          {type === "breeding" && (<>
            <div><Label>Heat Date</Label><Input type="date" value={heat} onChange={(e) => setHeat(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Insemination Date</Label><Input type="date" value={ins} onChange={(e) => setIns(e.target.value)} className="mt-1.5" /></div>
            <p className="text-xs text-muted-foreground">Due Date auto-calculated (+283 days).</p>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1.5" /></div>
          </>)}

          {type === "health" && (<>
            <div><Label>Type</Label>
              <Select value={hKind} onValueChange={setHKind}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="deworming">Deworming</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="vet_note">Vet note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={hDesc} onChange={(e) => setHDesc(e.target.value)} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
              <div><Label>Next Due</Label><Input type="date" value={hNext} onChange={(e) => setHNext(e.target.value)} className="mt-1.5" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Leave “Next Due” blank to auto-schedule: deworming +3 months, vaccination +6 months.</p>
          </>)}

          {type === "feeding" && (<>
            <div><Label>TMR / Feed Type *</Label><Input required value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder="TMR mix, silage, dairy meal…" className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity (Kg)</Label><Input type="number" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1.5" /></div>
              <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1.5" /></div>
          </>)}

          <Button type="submit" className="w-full h-11" disabled={busy || !cowId}>{busy ? "Saving…" : "Save Record"}</Button>
        </form>
      )}
    </div>
  );
};

export default AddRecord;