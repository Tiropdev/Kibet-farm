import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Beef, Bell, BarChart3, Settings, Plus, CalendarDays, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBell } from "./AlertBell";
import { OfflineIndicator } from "./OfflineIndicator";
import { useBranding } from "@/lib/branding";

const nav: { to: string; label: string; icon: any; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/cows", label: "Cows", icon: Beef },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const desktopExtraNav: { to: string; label: string; icon: any; end?: boolean }[] = [
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/milk/bulk", label: "Bulk Milk entry", icon: Droplets },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const brand = useBranding();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <OfflineIndicator />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-hero flex items-center justify-center shadow-sm overflow-hidden ring-1 ring-primary/20">
              <img src={brand.logoUrl} alt="" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <div className="font-display font-semibold leading-tight truncate max-w-[170px]">{brand.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[170px]">{brand.tagline}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[...nav, ...desktopExtraNav].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-soft text-primary" : "text-foreground hover:bg-secondary"
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-[10px] font-semibold tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Kibet Farm · v1.0
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Smart dairy management</div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
              <img src={brand.logoUrl} alt="" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm leading-tight truncate max-w-[150px]">{brand.name}</div>
              <div className="text-[10px] text-primary font-medium">Kibet Farm · v1.0</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AlertBell />
            <Button size="sm" className="rounded-full" onClick={() => navigate("/add")}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop top-right bell */}
      <div className="hidden md:flex fixed top-4 right-6 z-30">
        <div className="bg-card border border-border rounded-full px-1 py-1 shadow-sm">
          <AlertBell />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-64 pb-28 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">{children}</div>

        {/* Floating add button on desktop */}
        <Button
          onClick={() => navigate("/add")}
          className="hidden md:flex fixed bottom-8 right-8 rounded-full shadow-elevated h-14 px-6 text-base"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Record
        </Button>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border pb-safe">
        <div className="grid grid-cols-5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile floating add button */}
      <Button
        onClick={() => navigate("/add")}
        className="md:hidden fixed right-4 z-40 rounded-full shadow-elevated h-14 w-14 p-0"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
        aria-label="Add Record"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
};