import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Database, Image as ImageIcon, Palette, Settings as Cog, Bell, Upload, ChevronRight, Sparkles } from "lucide-react";
import { DEFAULT_BRANDING, FarmBranding, loadBranding, saveBranding, THEME_PRESETS, applyTheme } from "@/lib/branding";

const NOTIF_KEY = "khf-notifications-enabled";

const Settings = () => {
  const { user } = useAuth();
  const [brand, setBrand] = useState<FarmBranding>(loadBranding);
  const [notif, setNotif] = useState(localStorage.getItem(NOTIF_KEY) !== "false");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data?.full_name && brand.name === DEFAULT_BRANDING.name) setBrand((b) => ({ ...b, name: data.full_name as string }));
    });
  }, [user]);

  const updateBrand = (patch: Partial<FarmBranding>) => {
    const next = { ...brand, ...patch };
    setBrand(next);
    applyTheme(next.themeHue, next.themeSat); // live preview
  };

  const onLogoFile = (file: File) => {
    if (file.size > 800_000) {
      toast.error("Logo too large — keep it under 800 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBrand({ logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const saveAll = async () => {
    setBusy(true);
    saveBranding(brand);
    localStorage.setItem(NOTIF_KEY, String(notif));
    if (user) await supabase.from("profiles").upsert({ id: user.id, full_name: brand.name, notifications_enabled: notif });
    setBusy(false);
    toast.success("Settings saved");
  };

  const resetBrand = () => {
    setBrand(DEFAULT_BRANDING);
    applyTheme(DEFAULT_BRANDING.themeHue, DEFAULT_BRANDING.themeSat);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Cog className="w-6 h-6 text-primary" /> Admin &amp; Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Brand the app to your farm, manage alerts and back up your data.</p>
      </div>

      {/* Brand preview card */}
      <section className="farm-card overflow-hidden">
        <div className="bg-gradient-hero p-5 flex items-center gap-4 text-primary-foreground">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden border border-white/20">
            <img src={brand.logoUrl} alt="Logo preview" className="w-12 h-12 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl font-bold truncate">{brand.name}</div>
            <div className="text-sm opacity-90 truncate">{brand.tagline}</div>
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="farm-card p-5 space-y-4">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Farm branding
        </h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Farm name</Label>
            <Input value={brand.name} onChange={(e) => updateBrand({ name: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Input value={brand.tagline} onChange={(e) => updateBrand({ tagline: e.target.value })} className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Logo</Label>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl border border-border bg-secondary flex items-center justify-center overflow-hidden shrink-0">
              <img src={brand.logoUrl} alt="" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1.5" /> Upload logo
              </Button>
              {brand.logoUrl !== DEFAULT_BRANDING.logoUrl && (
                <Button variant="ghost" size="sm" onClick={() => updateBrand({ logoUrl: DEFAULT_BRANDING.logoUrl })}>
                  Reset logo
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                hidden
                onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="farm-card p-5 space-y-4">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Theme color
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {THEME_PRESETS.map((p) => {
            const active = brand.themeHue === p.hue && brand.themeSat === p.sat;
            return (
              <button
                key={p.label}
                onClick={() => updateBrand({ themeHue: p.hue, themeSat: p.sat })}
                className={`group rounded-xl p-2 border transition-all hover:-translate-y-0.5 ${active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"}`}
              >
                <div
                  className="w-full h-10 rounded-lg shadow-card"
                  style={{ background: `linear-gradient(135deg, hsl(${p.hue} ${p.sat + 5}% 50%), hsl(${(p.hue + 18) % 360} ${p.sat}% 38%))` }}
                />
                <div className="text-[10px] font-medium mt-1.5 text-center text-muted-foreground group-hover:text-foreground">{p.label}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <Label>Hue</Label>
              <span className="font-mono text-muted-foreground">{brand.themeHue}°</span>
            </div>
            <Slider value={[brand.themeHue]} min={0} max={360} step={1} onValueChange={([v]) => updateBrand({ themeHue: v })} className="mt-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <Label>Saturation</Label>
              <span className="font-mono text-muted-foreground">{brand.themeSat}%</span>
            </div>
            <Slider value={[brand.themeSat]} min={5} max={90} step={1} onValueChange={([v]) => updateBrand({ themeSat: v })} className="mt-2" />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="farm-card p-5 space-y-3">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notifications
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Alert pop-ups</div>
            <div className="text-xs text-muted-foreground">Show toast notifications when new alerts appear</div>
          </div>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>
      </section>

      {/* Backup link card */}
      <Link
        to="/backup"
        className="farm-card p-5 flex items-center gap-4 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Database className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold">Backup &amp; Export</div>
          <div className="text-xs text-muted-foreground">Download a full JSON backup or per-section CSVs</div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Link>

      <div className="flex gap-2 pt-2">
        <Button onClick={saveAll} disabled={busy} size="lg" className="flex-1 sm:flex-none">{busy ? "Saving…" : "Save settings"}</Button>
        <Button onClick={resetBrand} variant="outline" size="lg">Reset branding</Button>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">{brand.name} · v1.0</p>
    </div>
  );
};

export default Settings;