import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { StatusBadge } from "@/components/farm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Droplets, HeartPulse, Stethoscope, Wheat, Baby, FileText, Calendar, Check, CheckCircle2 } from "lucide-react";
import { CowStatus, calcAge, daysFromNow, logActivity, todayISO, breedingStage, markEventCompleted } from "@/lib/farm";
import { toast } from "@/hooks/use-toast";

const CowProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cow, setCow] = useState<any | null>(null);
  const [breeding, setBreeding] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [milk, setMilk] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [calves, setCalves] = useState<any[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    const [c, b, h, m, f, cv] = await Promise.all([
      supabase.from("cows").select("*").eq("id", id).single(),
      supabase.from("breeding_records").select("*").eq("cow_id", id).order("insemination_date", { ascending: false }),
      supabase.from("health_records").select("*").eq("cow_id", id).order("record_date", { ascending: false }),
      supabase.from("milk_records").select("*").eq("cow_id", id).order("record_date", { ascending: false }).limit(30),
      supabase.from("feed_records").select("*").eq("cow_id", id).order("record_date", { ascending: false }).limit(30),
      supabase.from("calves").select("*").eq("mother_cow_id", id).order("birth_date", { ascending: false }),
    ]);
    setCow(c.data);
    setBreeding(b.data ?? []);
    setHealth(h.data ?? []);
    setMilk(m.data ?? []);
    setFeed(f.data ?? []);
    setCalves(cv.data ?? []);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!cow) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const nextDue = breeding[0]?.expected_due_date;
  const todayMilk = milk.find((m) => m.record_date === todayISO());

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/cows")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> All Cows
      </button>

      {/* Header */}
      <div className="farm-card p-5">
        <div className="flex items-start gap-4">
          <CowAvatar src={cow.photo_url} name={cow.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{cow.name}</h1>
              {cow.tag && <span className="text-sm text-muted-foreground">#{cow.tag}</span>}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <StatusBadge status={cow.status as CowStatus} />
              <span className="text-xs text-muted-foreground">{cow.breed ?? "Breed —"} · {calcAge(cow.date_of_birth)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/cows/${cow.id}/edit`}><Pencil className="w-4 h-4" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
          <Quick icon={<Droplets className="w-4 h-4" />} label="Today's Milk" value={todayMilk ? `${Number(todayMilk.total_litres).toFixed(1)} L` : "—"} />
          <Quick icon={<HeartPulse className="w-4 h-4" />} label="Service · Due In" value={nextDue ? `${daysFromNow(nextDue)} days` : "—"} />
          <Quick icon={<Calendar className="w-4 h-4" />} label="Calves" value={String(cow.number_of_calves ?? 0)} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="milk">Production</TabsTrigger>
          <TabsTrigger value="feed">TMR</TabsTrigger>
          <TabsTrigger value="calves">Calves</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          <Row label="Breed" value={cow.breed ?? "—"} />
          <Row label="Age" value={calcAge(cow.date_of_birth)} />
          <Row label="Date Of Birth" value={cow.date_of_birth ?? "—"} />
          <Row label="Sire (Father)" value={(cow as any).sire || "—"} />
          <Row label="Dam (Mother)" value={(cow as any).dam || "—"} />
          <Row label="Calves" value={String(cow.number_of_calves)} />
          <Row label="Notes" value={cow.notes || "—"} />
        </TabsContent>

        <TabsContent value="breeding" className="mt-4 space-y-3">
          <SectionHeader title="Breeding Records" addLabel="Add Breeding" form={<BreedingForm cowId={cow.id} onDone={reload} />} />
          {breeding[0] && breedingStage(breeding[0]) && (() => {
            const s = breedingStage(breeding[0])!;
            const tone =
              s.stage === "overdue" || s.stage === "calving"
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : s.stage === "steaming"
                ? "bg-warning/15 text-warning-foreground border-warning/30"
                : "bg-primary-soft text-primary border-primary/20";
            return (
              <div className={`rounded-2xl border p-4 ${tone}`}>
                <div className="text-xs uppercase tracking-wide opacity-70">Current Stage</div>
                <div className="font-display font-semibold mt-1">{s.label}</div>
                <div className="text-xs mt-0.5 opacity-80">{s.sub}</div>
              </div>
            );
          })()}
          {breeding.length === 0 ? <Empty label="No breeding records yet." /> :
            breeding.map((b) => (
              <div key={b.id} className="farm-card p-4 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">Insemination: {b.insemination_date ?? "—"}</div>
                  {b.expected_due_date && <span className="text-xs text-primary font-medium">Due {b.expected_due_date}</span>}
                </div>
                <div className="text-xs text-muted-foreground">Heat: {b.heat_date ?? "—"}</div>
                {b.notes && <div className="text-xs mt-1">{b.notes}</div>}
                <DoneRow record={b} table="breeding_records" cowId={cow.id} onDone={reload} />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="health" className="mt-4 space-y-3">
          <SectionHeader title="Health Records" addLabel="Add Record" form={<HealthForm cowId={cow.id} onDone={reload} />} />
          {health.length === 0 ? <Empty label="No health records yet." /> :
            health.map((h) => (
              <div key={h.id} className="farm-card p-4 text-sm">
                <div className="flex justify-between">
                  <div className="font-medium capitalize">{h.kind.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{h.record_date}</div>
                </div>
                {h.description && <div className="text-sm mt-1">{h.description}</div>}
                {h.next_due_date && <div className="text-xs text-warning-foreground bg-warning/15 inline-block px-2 py-0.5 rounded-full mt-2">Next Due {h.next_due_date}</div>}
                <DoneRow record={h} table="health_records" cowId={cow.id} onDone={reload} />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="milk" className="mt-4 space-y-3">
          <SectionHeader title="Milk Records" addLabel="Add Milk" form={<MilkForm cowId={cow.id} onDone={reload} />} />
          {milk.length === 0 ? <Empty label="No milk records yet." /> :
            <div className="farm-card divide-y divide-border">
              {milk.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between text-sm">
                  <div className="font-medium">{m.record_date}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>AM {Number(m.am_litres).toFixed(1)}</span>
                    <span>PM {Number(m.pm_litres).toFixed(1)}</span>
                    <span className="text-primary font-medium">{Number(m.total_litres).toFixed(1)} L</span>
                  </div>
                </div>
              ))}
            </div>}
        </TabsContent>

        <TabsContent value="feed" className="mt-4 space-y-3">
          <SectionHeader title="Total Mixed Ratio (TMR) Records" addLabel="Add TMR" form={<FeedForm cowId={cow.id} onDone={reload} />} />
          {feed.length === 0 ? <Empty label="No feed records yet." /> :
            feed.map((f) => (
              <div key={f.id} className="farm-card p-4 text-sm flex justify-between items-start">
                <div>
                  <div className="font-medium">{f.feed_type}</div>
                  {f.notes && <div className="text-xs text-muted-foreground mt-0.5">{f.notes}</div>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{f.record_date}</div>
                  {f.quantity_kg && <div className="text-primary font-medium">{f.quantity_kg} kg</div>}
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="calves" className="mt-4 space-y-3">
          <SectionHeader title="Calves" addLabel="Add Calf" form={<CalfForm cowId={cow.id} onDone={reload} />} />
          {calves.length === 0 ? <Empty label="No calves recorded yet." /> :
            calves.map((c) => (
              <div key={c.id} className="farm-card p-4 text-sm flex justify-between">
                <div>
                  <div className="font-medium">{c.name || "Calf"}</div>
                  {c.notes && <div className="text-xs text-muted-foreground mt-0.5">{c.notes}</div>}
                </div>
                <div className="text-xs text-muted-foreground">{c.birth_date}</div>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Quick = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div>
    <div className="flex items-center gap-1 text-muted-foreground text-xs">{icon}{label}</div>
    <div className="font-display font-semibold mt-0.5">{value}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="farm-card p-4 flex justify-between items-start gap-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm text-right whitespace-pre-wrap">{value}</span>
  </div>
);

const Empty = ({ label }: { label: string }) => (
  <div className="farm-card p-6 text-center text-sm text-muted-foreground">{label}</div>
);

function DoneRow({
  record,
  table,
  cowId,
  onDone,
}: {
  record: any;
  table: "breeding_records" | "health_records";
  cowId: string;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (record.completed_at) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary bg-primary-soft px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completed {new Date(record.completed_at).toLocaleDateString()}
        {record.completion_note ? ` · ${record.completion_note}` : ""}
      </div>
    );
  }
  const handle = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await markEventCompleted({
        table,
        id: record.id,
        user_id: user.id,
        cow_id: cowId,
        description:
          table === "breeding_records"
            ? "Breeding event marked as done"
            : `${record.kind ?? "Health"} marked as done`,
      });
      toast({ title: "Marked as done" });
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex justify-end">
      <Button size="sm" variant="outline" disabled={busy} onClick={handle} className="text-primary border-primary/30 hover:bg-primary-soft h-8">
        <Check className="w-3.5 h-3.5 mr-1" /> Mark Done
      </Button>
    </div>
  );
}

const SectionHeader = ({ title, addLabel, form }: { title: string; addLabel: string; form: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-display font-semibold">{title}</h3>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="rounded-full"><Plus className="w-4 h-4 mr-1" /> {addLabel}</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{addLabel}</DialogTitle></DialogHeader>
          {/* Inject onClose into form via cloneElement */}
          {React.isValidElement(form) ? React.cloneElement(form as any, { onClose: () => setOpen(false) }) : form}
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React from "react";

/* ---- Forms ---- */

function BreedingForm({ cowId, onDone, onClose }: { cowId: string; onDone: () => void; onClose?: () => void }) {
  const { user } = useAuth();
  const [heat, setHeat] = useState("");
  const [ins, setIns] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("breeding_records").insert({ user_id: user.id, cow_id: cowId, heat_date: heat || null, insemination_date: ins || null, notes: notes || null });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await logActivity({ user_id: user.id, cow_id: cowId, kind: "breeding", description: "Recorded Insemination" });
    toast({ title: "Saved" }); onDone(); onClose?.();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Heat Date</Label><Input type="date" value={heat} onChange={(e) => setHeat(e.target.value)} className="mt-1.5" /></div>
      <div><Label>Insemination Date</Label><Input type="date" value={ins} onChange={(e) => setIns(e.target.value)} className="mt-1.5" /></div>
      <p className="text-xs text-muted-foreground">Due Date auto-calculated (+283 days).</p>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} /></div>
      <DialogFooter><Button type="submit" className="w-full">Save</Button></DialogFooter>
    </form>
  );
}

function HealthForm({ cowId, onDone, onClose }: { cowId: string; onDone: () => void; onClose?: () => void }) {
  const { user } = useAuth();
  const [kind, setKind] = useState("vaccination");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());
  const [next, setNext] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("health_records").insert({ user_id: user.id, cow_id: cowId, kind: kind as any, description: desc || null, record_date: date, next_due_date: next || null });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await logActivity({ user_id: user.id, cow_id: cowId, kind: "health", description: `${kind}: ${desc}`.trim() });
    toast({ title: "Saved" }); onDone(); onClose?.();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Type</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vaccination">Vaccination</SelectItem>
            <SelectItem value="deworming">Deworming</SelectItem>
            <SelectItem value="treatment">Treatment</SelectItem>
            <SelectItem value="vet_note">Vet note</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1.5" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
        <div><Label>Next Due</Label><Input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1.5" /></div>
      </div>
      <DialogFooter><Button type="submit" className="w-full">Save</Button></DialogFooter>
    </form>
  );
}

function MilkForm({ cowId, onDone, onClose }: { cowId: string; onDone: () => void; onClose?: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [am, setAm] = useState("0");
  const [pm, setPm] = useState("0");
  const total = (Number(am) || 0) + (Number(pm) || 0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("milk_records").insert({ user_id: user.id, cow_id: cowId, record_date: date, am_litres: Number(am) || 0, pm_litres: Number(pm) || 0 });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await logActivity({ user_id: user.id, cow_id: cowId, kind: "milk", description: `Milked ${total.toFixed(1)} L` });
    toast({ title: "Saved" }); onDone(); onClose?.();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>AM (L)</Label><Input type="number" step="0.1" value={am} onChange={(e) => setAm(e.target.value)} className="mt-1.5" /></div>
        <div><Label>PM (L)</Label><Input type="number" step="0.1" value={pm} onChange={(e) => setPm(e.target.value)} className="mt-1.5" /></div>
      </div>
      <div className="text-sm text-muted-foreground">Total: <span className="font-display font-semibold text-primary">{total.toFixed(1)} L</span></div>
      <DialogFooter><Button type="submit" className="w-full">Save</Button></DialogFooter>
    </form>
  );
}

function FeedForm({ cowId, onDone, onClose }: { cowId: string; onDone: () => void; onClose?: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("feed_records").insert({ user_id: user.id, cow_id: cowId, feed_type: type, quantity_kg: qty ? Number(qty) : null, record_date: date, notes: notes || null });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    await logActivity({ user_id: user.id, cow_id: cowId, kind: "feeding", description: `Fed ${type}${qty ? ` (${qty} kg)` : ""}` });
    toast({ title: "Saved" }); onDone(); onClose?.();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Feed type *</Label><Input required value={type} onChange={(e) => setType(e.target.value)} placeholder="Hay, silage, dairy meal…" className="mt-1.5" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Quantity (Kg)</Label><Input type="number" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1.5" /></div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} /></div>
      <DialogFooter><Button type="submit" className="w-full">Save</Button></DialogFooter>
    </form>
  );
}

function CalfForm({ cowId, onDone, onClose }: { cowId: string; onDone: () => void; onClose?: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("calves").insert({ user_id: user.id, mother_cow_id: cowId, name: name || null, birth_date: date, notes: notes || null });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    // bump calf count
    const { data: cow } = await supabase.from("cows").select("number_of_calves").eq("id", cowId).single();
    await supabase.from("cows").update({ number_of_calves: (cow?.number_of_calves ?? 0) + 1 }).eq("id", cowId);
    await logActivity({ user_id: user.id, cow_id: cowId, kind: "calf", description: `Calf ${name || "born"}` });
    toast({ title: "Saved" }); onDone(); onClose?.();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
      <div><Label>Birth date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} /></div>
      <DialogFooter><Button type="submit" className="w-full">Save</Button></DialogFooter>
    </form>
  );
}

export default CowProfile;