import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { CowStatus, logActivity } from "@/lib/farm";

const CowForm = () => {
  const { id } = useParams();
  const editing = id && id !== "new";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tag: "",
    breed: "",
    date_of_birth: "",
    number_of_calves: 0,
    status: "lactating" as CowStatus,
    notes: "",
    photo_url: null as string | null,
    sire: "",
    dam: "",
  });

  useEffect(() => {
    if (!editing || !user) return;
    (async () => {
      const { data } = await supabase.from("cows").select("*").eq("id", id).single();
      if (data) {
        setForm({
          name: data.name,
          tag: data.tag ?? "",
          breed: data.breed ?? "",
          date_of_birth: data.date_of_birth ?? "",
          number_of_calves: data.number_of_calves ?? 0,
          status: data.status as CowStatus,
          notes: data.notes ?? "",
          photo_url: data.photo_url,
          sire: (data as any).sire ?? "",
          dam: (data as any).dam ?? "",
        });
        setPhotoPreview(data.photo_url);
      }
    })();
  }, [id, editing, user]);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let photo_url = form.photo_url;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("cow-photos").upload(path, photoFile);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("cow-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        photo_url = signed?.signedUrl ?? null;
      }
      const payload = {
        user_id: user.id,
        name: form.name,
        tag: form.tag || null,
        breed: form.breed || null,
        date_of_birth: form.date_of_birth || null,
        number_of_calves: Number(form.number_of_calves) || 0,
        status: form.status,
        notes: form.notes || null,
        photo_url,
        sire: form.sire || null,
        dam: form.dam || null,
      } as any;
      if (editing) {
        const { error } = await supabase.from("cows").update(payload).eq("id", id);
        if (error) throw error;
        await logActivity({ user_id: user.id, cow_id: id!, kind: "cow", description: `Updated ${form.name}` });
        toast({ title: "Cow updated" });
        navigate(`/cows/${id}`);
      } else {
        const { data, error } = await supabase.from("cows").insert(payload).select().single();
        if (error) throw error;
        await logActivity({ user_id: user.id, cow_id: data.id, kind: "cow", description: `Added cow ${form.name}` });
        toast({ title: "Cow added" });
        navigate(`/cows/${data.id}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    await supabase.from("cows").delete().eq("id", id);
    toast({ title: "Cow deleted" });
    navigate("/cows");
  };

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-bold mb-5">{editing ? "Edit Cow" : "Add Cow"}</h1>
      <form onSubmit={submit} className="farm-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <CowAvatar name={form.name || "Cow"} size="lg" />
          )}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80 text-sm font-medium">
            <Upload className="w-4 h-4" /> {photoPreview ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="tag">Tag</Label>
            <Input id="tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="breed">Breed</Label>
            <Input id="breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Friesian, Jersey…" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dob">Date Of Birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="calves">Number Of Calves</Label>
            <Input id="calves" type="number" min={0} value={form.number_of_calves} onChange={(e) => setForm({ ...form, number_of_calves: Number(e.target.value) })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="sire">Sire (Father)</Label>
            <Input id="sire" value={form.sire} onChange={(e) => setForm({ ...form, sire: e.target.value })} placeholder="Sire name or tag" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dam">Dam (Mother)</Label>
            <Input id="dam" value={form.dam} onChange={(e) => setForm({ ...form, dam: e.target.value })} placeholder="Dam name or tag" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CowStatus })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lactating">Milk Production</SelectItem>
                <SelectItem value="dry">Dry</SelectItem>
                <SelectItem value="pregnant">Date Of Service</SelectItem>
                <SelectItem value="sick">Health</SelectItem>
                <SelectItem value="calf">Calf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={3} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={busy} className="flex-1 h-11">{busy ? "Saving…" : editing ? "Save Changes" : "Add Cow"}</Button>
          {editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-11">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this cow?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes <strong>{form.name || "the cow"}</strong> and all
                    related milk, breeding, health, feed and calf records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete cow
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
};

export default CowForm;