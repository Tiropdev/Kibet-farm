ALTER TABLE public.breeding_records ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.breeding_records ADD COLUMN IF NOT EXISTS completion_note text;
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS completion_note text;