import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { flushQueue, queueSize } from "@/lib/offlineQueue";
import { toast } from "sonner";

export const OfflineIndicator = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(queueSize());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onQ = (e: Event) => setPending((e as CustomEvent).detail ?? queueSize());
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("kfy-queue-changed", onQ);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("kfy-queue-changed", onQ);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <button
      onClick={async () => {
        if (!navigator.onLine) return;
        const r = await flushQueue();
        if (r.ok) toast.success(`Synced ${r.ok}`);
      }}
      className={`fixed left-1/2 -translate-x-1/2 z-40 px-3 h-8 rounded-full text-[11px] font-medium shadow-elevated flex items-center gap-1.5 border ${
        online ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-destructive text-destructive-foreground border-destructive"
      }`}
      style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      {online ? <RefreshCw className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
      {online ? `Sync ${pending} pending` : `Offline · ${pending} queued`}
    </button>
  );
};