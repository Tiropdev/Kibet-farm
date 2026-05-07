
alter function public.set_updated_at() set search_path = public;
alter function public.set_breeding_due_date() set search_path = public;

drop policy if exists "cow photos public read" on storage.objects;
create policy "cow photos owner read" on storage.objects
for select using (bucket_id = 'cow-photos' and auth.uid()::text = (storage.foldername(name))[1]);
