import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildAlerts, FarmAlert } from "@/lib/farm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CowAvatar } from "./CowAvatar";
import { AlertPill } from "./AlertBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SEEN_KEY = "khf-seen-alerts-v1";
const NOTIF_KEY = "khf-notifications-enabled";

const loadSeen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
};
const saveSeen = (s: Set<string>) => localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s)));

export const AlertBell = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef<Set<string>>(loadSeen());
  const firstLoadRef = useRef(true);

  const refresh = async (uid: string) => {
    const a = await buildAlerts(uid);
    setAlerts(a);
    const seen = seenRef.current;
    const fresh = a.filter((x) => !seen.has(x.id));
    setUnread(fresh.length);

    // Toast urgent fresh alerts (skip first ever load to avoid noise after refresh)
    const notifEnabled = localStorage.getItem(NOTIF_KEY) !== "false";
    if (notifEnabled && !firstLoadRef.current) {
      fresh
        .filter((x) => x.level === "urgent")
        .slice(0, 3)
        .forEach((x) => {
          toast.warning(x.cow_name, { description: x.message });
        });
    } else if (firstLoadRef.current && notifEnabled && fresh.some((x) => x.level === "urgent")) {
      // On first load, summarise urgent count
      const count = fresh.filter((x) => x.level === "urgent").length;
      toast.warning(`${count} urgent alert${count === 1 ? "" : "s"}`, {
        description: "Tap the bell to review",
      });
    }
    firstLoadRef.current = false;
  };

  useEffect(() => {
    if (!user) return;
    refresh(user.id);
    const interval = setInterval(() => refresh(user.id), 60_000);
    // Refresh whenever data changes
    const channel = supabase
      .channel(`alerts-refresh-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cows" }, () => refresh(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "breeding_records" }, () => refresh(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "health_records" }, () => refresh(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "milk_records" }, () => refresh(user.id))
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAllSeen = () => {
    const next = new Set(alerts.map((a) => a.id));
    seenRef.current = next;
    saveSeen(next);
    setUnread(0);
  };

  return (
    <Popover onOpenChange={(o) => o && markAllSeen()}>
      <PopoverTrigger className="relative w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="font-display font-semibold text-sm">Alerts</div>
          <Link to="/alerts" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">All clear ✨</div>
          ) : (
            alerts.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                to={`/cows/${a.cow_id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 border-b border-border/50 last:border-0"
              >
                <CowAvatar src={a.cow_photo} name={a.cow_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs truncate">{a.cow_name}</span>
                    <AlertPill level={a.level}>{a.level}</AlertPill>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{a.message}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
