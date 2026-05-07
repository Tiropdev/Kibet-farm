import { supabase } from "@/integrations/supabase/client";

const csvEscape = (v: any) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCSV = (filename: string, rows: any[]) => {
  if (rows.length === 0) {
    return false;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

const today = () => new Date().toISOString().slice(0, 10);

export async function exportMilkCSV(userId: string) {
  const [milk, cows] = await Promise.all([
    supabase.from("milk_records").select("*").eq("user_id", userId).order("record_date", { ascending: false }),
    supabase.from("cows").select("id, name, tag").eq("user_id", userId),
  ]);
  const map = new Map((cows.data ?? []).map((c) => [c.id, c]));
  const rows = (milk.data ?? []).map((m) => {
    const c = map.get(m.cow_id);
    return {
      date: m.record_date,
      cow: c?.name ?? "",
      tag: c?.tag ?? "",
      am_litres: m.am_litres,
      pm_litres: m.pm_litres,
      total_litres: m.total_litres,
      notes: m.notes ?? "",
    };
  });
  return downloadCSV(`milk-records-${today()}.csv`, rows);
}

export async function exportHealthCSV(userId: string) {
  const [health, cows] = await Promise.all([
    supabase.from("health_records").select("*").eq("user_id", userId).order("record_date", { ascending: false }),
    supabase.from("cows").select("id, name, tag").eq("user_id", userId),
  ]);
  const map = new Map((cows.data ?? []).map((c) => [c.id, c]));
  const rows = (health.data ?? []).map((h) => {
    const c = map.get(h.cow_id);
    return {
      date: h.record_date,
      cow: c?.name ?? "",
      tag: c?.tag ?? "",
      kind: h.kind,
      description: h.description ?? "",
      next_due: h.next_due_date ?? "",
      notes: h.notes ?? "",
    };
  });
  return downloadCSV(`health-records-${today()}.csv`, rows);
}

export async function exportBreedingCSV(userId: string) {
  const [br, cows] = await Promise.all([
    supabase.from("breeding_records").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("cows").select("id, name, tag").eq("user_id", userId),
  ]);
  const map = new Map((cows.data ?? []).map((c) => [c.id, c]));
  const rows = (br.data ?? []).map((b) => {
    const c = map.get(b.cow_id);
    return {
      cow: c?.name ?? "",
      tag: c?.tag ?? "",
      heat_date: b.heat_date ?? "",
      insemination_date: b.insemination_date ?? "",
      expected_due_date: b.expected_due_date ?? "",
      notes: b.notes ?? "",
    };
  });
  return downloadCSV(`breeding-records-${today()}.csv`, rows);
}

export async function exportCowsCSV(userId: string) {
  const { data } = await supabase.from("cows").select("*").eq("user_id", userId).order("name");
  const rows = (data ?? []).map((c) => ({
    name: c.name,
    tag: c.tag ?? "",
    breed: c.breed ?? "",
    status: c.status,
    date_of_birth: c.date_of_birth ?? "",
    number_of_calves: c.number_of_calves,
    notes: c.notes ?? "",
  }));
  return downloadCSV(`cows-${today()}.csv`, rows);
}
