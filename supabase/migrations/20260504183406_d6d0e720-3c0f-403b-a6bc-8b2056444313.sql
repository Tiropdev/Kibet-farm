ALTER TABLE public.milk_records DROP COLUMN IF EXISTS total_litres;
ALTER TABLE public.milk_records ADD COLUMN IF NOT EXISTS noon_litres numeric(6,2) NOT NULL DEFAULT 0;
ALTER TABLE public.milk_records ADD COLUMN total_litres numeric(7,2)
  GENERATED ALWAYS AS (COALESCE(am_litres,0) + COALESCE(noon_litres,0) + COALESCE(pm_litres,0)) STORED;

-- Merge duplicates
WITH grouped AS (
  SELECT user_id, cow_id, record_date,
         SUM(am_litres) AS am, SUM(noon_litres) AS noon, SUM(pm_litres) AS pm,
         (ARRAY_AGG(id ORDER BY created_at))[1] AS keep_id
  FROM public.milk_records
  GROUP BY user_id, cow_id, record_date
  HAVING COUNT(*) > 1
)
UPDATE public.milk_records m
SET am_litres = g.am, noon_litres = g.noon, pm_litres = g.pm
FROM grouped g
WHERE m.id = g.keep_id;

DELETE FROM public.milk_records m
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, cow_id, record_date ORDER BY created_at) AS rn
  FROM public.milk_records
) d
WHERE m.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS milk_records_unique_per_day
  ON public.milk_records (user_id, cow_id, record_date);

CREATE OR REPLACE FUNCTION public.set_health_next_due()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.next_due_date IS NULL THEN
    IF NEW.kind = 'deworming' THEN
      NEW.next_due_date := NEW.record_date + INTERVAL '90 days';
    ELSIF NEW.kind = 'vaccination' THEN
      NEW.next_due_date := NEW.record_date + INTERVAL '180 days';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_health_next_due ON public.health_records;
CREATE TRIGGER trg_health_next_due
BEFORE INSERT ON public.health_records
FOR EACH ROW EXECUTE FUNCTION public.set_health_next_due();

DROP TRIGGER IF EXISTS trg_breeding_due ON public.breeding_records;
CREATE TRIGGER trg_breeding_due
BEFORE INSERT OR UPDATE ON public.breeding_records
FOR EACH ROW EXECUTE FUNCTION public.set_breeding_due_date();