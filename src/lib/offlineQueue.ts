import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEY = "kfy-offline-queue-v1";

export type QueuedOp = {
  id: string;
  table: "milk_records" | "feed_records" | "health_records" | "breeding_records" | "activity_log";
  mode: "insert" | "upsert";
  payload: any;
  created_at: number;
};

function read(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(q: QueuedOp[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent("kfy-queue-changed", { detail: q.length }));
}

export function queueSize(): number { return read().length; }

export function enqueue(op: Omit<QueuedOp, "id" | "created_at">) {
  const q = read();
  q.push({ ...op, id: crypto.randomUUID(), created_at: Date.now() });
  write(q);
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  if (!navigator.onLine) return { ok: 0, fail: 0 };
  const q = read();
  if (q.length === 0) return { ok: 0, fail: 0 };
  let ok = 0, fail = 0;
  const remaining: QueuedOp[] = [];
  for (const op of q) {
    try {
      const tbl = (supabase.from as any)(op.table);
      const { error } = op.mode === "upsert" ? await tbl.upsert(op.payload) : await tbl.insert(op.payload);
      if (error) { remaining.push(op); fail++; } else ok++;
    } catch { remaining.push(op); fail++; }
  }
  write(remaining);
  return { ok, fail };
}

/** Try Supabase first; if offline or call fails network-side, queue and resolve quietly. */
export async function safeUpsert(table: QueuedOp["table"], payload: any, mode: "insert" | "upsert" = "upsert") {
  if (!navigator.onLine) {
    enqueue({ table, mode, payload });
    toast.message("Saved offline", { description: "Will sync when you're back online." });
    return { queued: true as const };
  }
  try {
    const tbl = (supabase.from as any)(table);
    const { error } = mode === "upsert" ? await tbl.upsert(payload) : await tbl.insert(payload);
    if (error) throw error;
    return { queued: false as const };
  } catch (e: any) {
    enqueue({ table, mode, payload });
    toast.message("Saved offline", { description: "Will sync when you're back online." });
    return { queued: true as const };
  }
}

export function initOfflineSync() {
  const handler = async () => {
    const r = await flushQueue();
    if (r.ok > 0) toast.success(`Synced ${r.ok} offline record${r.ok === 1 ? "" : "s"}`);
  };
  window.addEventListener("online", handler);
  // Initial attempt
  setTimeout(handler, 1500);
}