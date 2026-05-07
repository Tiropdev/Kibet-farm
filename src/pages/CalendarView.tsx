import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { CowAvatar } from "@/components/farm/CowAvatar";
import { CalendarDays, HeartPulse, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  date: string;
  cow_id: string;
  cow_name: string;
  cow_photo: string | null;
  kind: "calving" | "vaccination" | "deworming" | "treatment" | "vet_note";
  label: string;
}

const KIND_TONE: Record<Event["kind"], string> = {
  calving: "bg-accent text-accent-foreground",
  vaccination: "bg-primary-soft text-primary",
  deworming: "bg-warning/15 text-warning-foreground",
  treatment: "bg-destructive/10 text-destructive",
  vet_note: "bg-muted text-muted-foreground",
};

const CalendarView = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cowsRes, breedRes, healthRes] = await Promise.all([
        supabase.from("cows").select("id, name, photo_url").eq("user_id", user.id),
        supabase
          .from("breeding_records")
          .select("cow_id, expected_due_date")
          .eq("user_id", user.id)
          .not("expected_due_date", "is", null),
        supabase
          .from("health_records")
          .select("cow_id, kind, description, next_due_date")
          .eq("user_id", user.id)
          .not("next_due_date", "is", null),
      ]);
      const cowMap = new Map((cowsRes.data ?? []).map((c) => [c.id, c]));
      const evts: Event[] = [];
      for (const b of breedRes.data ?? []) {
        const c = cowMap.get(b.cow_id);
        if (!c || !b.expected_due_date) continue;
        evts.push({
          date: b.expected_due_date,
          cow_id: c.id,
          cow_name: c.name,
          cow_photo: c.photo_url,
          kind: "calving",
          label: "Expected calving",
        });
      }
      for (const h of healthRes.data ?? []) {
        const c = cowMap.get(h.cow_id);
        if (!c || !h.next_due_date) continue;
        evts.push({
          date: h.next_due_date,
          cow_id: c.id,
          cow_name: c.name,
          cow_photo: c.photo_url,
          kind: h.kind as Event["kind"],
          label: h.description ?? h.kind,
        });
      }
      setEvents(evts);
    })();
  }, [user]);

  const eventDates = useMemo(() => events.map((e) => parseISO(e.date)), [events]);
  const dayEvents = useMemo(
    () => (selected ? events.filter((e) => isSameDay(parseISO(e.date), selected)) : []),
    [events, selected]
  );
  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events
      .filter((e) => parseISO(e.date) >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [events]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" /> Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Upcoming calvings, vaccinations and treatments.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="farm-card p-3 md:p-5">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ hasEvent: eventDates }}
            modifiersClassNames={{ hasEvent: "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary" }}
            className={cn("p-0 pointer-events-auto")}
          />
          <div className="flex flex-wrap gap-2 mt-4 text-[11px]">
            {(["calving", "vaccination", "deworming", "treatment"] as const).map((k) => (
              <span key={k} className={cn("px-2 py-0.5 rounded-full capitalize", KIND_TONE[k])}>
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-display font-semibold mb-2">
              {selected ? format(selected, "EEEE, d MMM yyyy") : "Pick a date"}
            </h2>
            {dayEvents.length === 0 ? (
              <div className="farm-card p-5 text-center text-sm text-muted-foreground">No events on this day.</div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((e, i) => (
                  <Link
                    key={i}
                    to={`/cows/${e.cow_id}`}
                    className="farm-card p-3 flex items-center gap-3 hover:bg-secondary/50"
                  >
                    <CowAvatar src={e.cow_photo} name={e.cow_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{e.cow_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.label}</div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] capitalize", KIND_TONE[e.kind])}>
                      {e.kind}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display font-semibold mb-2">Next 8 events</h2>
            {upcoming.length === 0 ? (
              <div className="farm-card p-5 text-center text-sm text-muted-foreground">Nothing scheduled.</div>
            ) : (
              <div className="farm-card divide-y divide-border">
                {upcoming.map((e, i) => (
                  <Link
                    key={i}
                    to={`/cows/${e.cow_id}`}
                    className="p-3 flex items-center gap-3 hover:bg-secondary/50"
                  >
                    <div className="w-12 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {format(parseISO(e.date), "MMM")}
                      </div>
                      <div className="font-display text-lg font-bold leading-none">
                        {format(parseISO(e.date), "d")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{e.cow_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.kind === "calving" ? <HeartPulse className="inline w-3 h-3 mr-1" /> : <Stethoscope className="inline w-3 h-3 mr-1" />}
                        {e.label}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
