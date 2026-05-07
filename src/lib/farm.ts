import { supabase } from "@/integrations/supabase/client";

export type CowStatus = "lactating" | "dry" | "pregnant" | "sick" | "calf";

export const STATUS_LABELS: Record<CowStatus, string> = {
  lactating: "Milk production",
  dry: "Dry",
  pregnant: "Date of service",
  sick: "Health",
  calf: "Calf",
};

export const STATUS_BADGE: Record<CowStatus, string> = {
  lactating: "bg-primary-soft text-primary",
  pregnant: "bg-accent text-accent-foreground",
  dry: "bg-muted text-muted-foreground",
  sick: "bg-destructive/10 text-destructive",
  calf: "bg-warning/15 text-warning-foreground",
};

export async function logActivity(opts: {
  user_id: string;
  cow_id?: string | null;
  kind: "milk" | "breeding" | "health" | "feeding" | "calf" | "cow";
  description: string;
}) {
  await supabase.from("activity_log").insert({
    user_id: opts.user_id,
    cow_id: opts.cow_id ?? null,
    kind: opts.kind,
    description: opts.description,
  });
}

export function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const remM = months % 12;
  return remM ? `${years}y ${remM}m` : `${years}y`;
}

export function daysFromNow(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mark a scheduled event (breeding/health) as accomplished. */
export async function markEventCompleted(opts: {
  table: "breeding_records" | "health_records";
  id: string;
  user_id: string;
  cow_id?: string | null;
  note?: string | null;
  description?: string;
}) {
  const { error } = await supabase
    .from(opts.table)
    .update({ completed_at: new Date().toISOString(), completion_note: opts.note ?? null })
    .eq("id", opts.id);
  if (error) throw error;
  await logActivity({
    user_id: opts.user_id,
    cow_id: opts.cow_id ?? null,
    kind: opts.table === "breeding_records" ? "breeding" : "health",
    description: opts.description ?? "Marked event as done",
  });
}

/** Given an insemination/service date and an expected due date, describe the
 *  current breeding stage in plain language. */
export function breedingStage(opts: { insemination_date?: string | null; expected_due_date?: string | null }):
  | { stage: "service" | "early" | "steaming" | "calving" | "overdue"; label: string; sub: string }
  | null {
  const due = opts.expected_due_date;
  const ins = opts.insemination_date;
  if (!due && !ins) return null;
  const daysToDue = due ? daysFromNow(due) : null;
  const monthsPregnant = ins
    ? Math.max(0, Math.floor((Date.now() - new Date(ins).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null;
  if (daysToDue !== null && daysToDue < 0) {
    return { stage: "overdue", label: "Calving overdue", sub: `${Math.abs(daysToDue)} day${Math.abs(daysToDue) === 1 ? "" : "s"} past due` };
  }
  if (daysToDue !== null && daysToDue <= 14) {
    return { stage: "calving", label: "Calving down (≈9 months)", sub: `Due in ${daysToDue} day${daysToDue === 1 ? "" : "s"}` };
  }
  if (daysToDue !== null && daysToDue <= 60) {
    return { stage: "steaming", label: "Steaming up (≈8 months)", sub: `Due in ${daysToDue} days · stop milking, boost feed` };
  }
  if (monthsPregnant !== null) {
    return { stage: "early", label: `In service · month ${monthsPregnant + 1}`, sub: due ? `Due ${due}` : "Due date pending" };
  }
  return { stage: "service", label: "Service recorded", sub: due ? `Due ${due}` : "" };
}

export interface FarmAlert {
  id: string;
  cow_id: string;
  cow_name: string;
  cow_photo: string | null;
  level: "urgent" | "upcoming" | "info";
  message: string;
  date: string;
  /** Source record so the user can mark it accomplished. */
  source?: { table: "breeding_records" | "health_records"; id: string };
}

/** Build alerts derived from current data. */
export async function buildAlerts(userId: string): Promise<FarmAlert[]> {
  const [cowsRes, breedRes, healthRes, milkRes] = await Promise.all([
    supabase.from("cows").select("id, name, photo_url, status").eq("user_id", userId),
    supabase.from("breeding_records").select("id, cow_id, expected_due_date, insemination_date, completed_at").eq("user_id", userId).is("completed_at", null),
    supabase.from("health_records").select("id, cow_id, kind, description, next_due_date, completed_at").eq("user_id", userId).not("next_due_date", "is", null).is("completed_at", null),
    supabase.from("milk_records").select("cow_id, record_date, total_litres").eq("user_id", userId).gte("record_date", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)),
  ]);

  const cows = cowsRes.data ?? [];
  const cowMap = new Map(cows.map((c) => [c.id, c]));
  const alerts: FarmAlert[] = [];

  for (const b of breedRes.data ?? []) {
    const cow = cowMap.get(b.cow_id);
    if (!cow || !b.expected_due_date) continue;
    const days = daysFromNow(b.expected_due_date);
    if (days === null) continue;
    if (days < 0) {
      alerts.push({
        id: `b-${b.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: "urgent",
        message: `Overdue calving — expected ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`,
        date: b.expected_due_date,
        source: { table: "breeding_records", id: b.id },
      });
    } else if (days <= 14) {
      alerts.push({
        id: `b-${b.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: days <= 3 ? "urgent" : "upcoming",
        message: `Calving due in ${days} day${days === 1 ? "" : "s"}`,
        date: b.expected_due_date,
        source: { table: "breeding_records", id: b.id },
      });
    }
    // Post-insemination follow-up at ~21 days
    if (b.insemination_date) {
      const sinceIns = daysFromNow(b.insemination_date);
      if (sinceIns !== null && sinceIns <= -19 && sinceIns >= -25) {
        alerts.push({
          id: `bf-${b.id}`,
          cow_id: cow.id,
          cow_name: cow.name,
          cow_photo: cow.photo_url,
          level: "upcoming",
          message: "Check for return-to-heat (21-day follow-up)",
          date: b.insemination_date,
          source: { table: "breeding_records", id: b.id },
        });
      }
    }
  }

  for (const h of healthRes.data ?? []) {
    const cow = cowMap.get(h.cow_id);
    if (!cow || !h.next_due_date) continue;
    const days = daysFromNow(h.next_due_date);
    if (days === null) continue;
    if (days <= 14) {
      alerts.push({
        id: `h-${h.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: days < 0 ? "urgent" : days <= 3 ? "urgent" : "upcoming",
        message: `${h.kind === "vaccination" ? "Vaccination" : h.kind === "deworming" ? "Deworming" : "Treatment"} ${days < 0 ? "overdue" : "due"}: ${h.description ?? ""}`.trim(),
        date: h.next_due_date,
        source: { table: "health_records", id: h.id },
      });
    }
  }

  // Sick cows
  for (const cow of cows) {
    if (cow.status === "sick") {
      alerts.push({
        id: `s-${cow.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: "urgent",
        message: "Marked as sick — needs attention",
        date: todayISO(),
      });
    }
  }

  // Missing milk record today for lactating cows
  const today = todayISO();
  const milkedToday = new Set((milkRes.data ?? []).filter((m) => m.record_date === today).map((m) => m.cow_id));
  for (const cow of cows) {
    if (cow.status === "lactating" && !milkedToday.has(cow.id)) {
      alerts.push({
        id: `m-${cow.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: "info",
        message: "No milk record for today",
        date: today,
      });
    }
  }

  // Yield-drop detection: 3-day avg < 85% of 14-day avg
  const todayMs = Date.now();
  const byCow = new Map<string, { recent: number[]; older: number[] }>();
  for (const m of milkRes.data ?? []) {
    const ageDays = Math.round((todayMs - new Date(m.record_date).getTime()) / 86400000);
    if (ageDays < 0 || ageDays > 14) continue;
    const litres = Number(m.total_litres ?? 0);
    if (!byCow.has(m.cow_id)) byCow.set(m.cow_id, { recent: [], older: [] });
    const bucket = byCow.get(m.cow_id)!;
    if (ageDays <= 3) bucket.recent.push(litres);
    else bucket.older.push(litres);
  }
  for (const cow of cows) {
    if (cow.status !== "lactating") continue;
    const b = byCow.get(cow.id);
    if (!b || b.recent.length < 2 || b.older.length < 5) continue;
    const recentAvg = b.recent.reduce((s, x) => s + x, 0) / b.recent.length;
    const olderAvg = b.older.reduce((s, x) => s + x, 0) / b.older.length;
    if (olderAvg > 0 && recentAvg / olderAvg < 0.85) {
      const dropPct = Math.round((1 - recentAvg / olderAvg) * 100);
      alerts.push({
        id: `yd-${cow.id}`,
        cow_id: cow.id,
        cow_name: cow.name,
        cow_photo: cow.photo_url,
        level: dropPct >= 25 ? "urgent" : "upcoming",
        message: `Yield down ${dropPct}% (3-day vs 14-day avg) — check for mastitis or heat stress`,
        date: today,
      });
    }
  }

  const order = { urgent: 0, upcoming: 1, info: 2 } as const;
  return alerts.sort((a, b) => order[a.level] - order[b.level] || a.date.localeCompare(b.date));
}