-- Guided clone-photo setup: expand lora_photos.category into a real shot list
-- (front / left / right / expression / half / body) so the creator is told
-- exactly what to upload. 'face'/'other' kept for backward compatibility.
alter table public.lora_photos drop constraint if exists lora_photos_category_check;
alter table public.lora_photos add constraint lora_photos_category_check
  check (category in ('front','left','right','expression','half','body','face','other'));
alter table public.lora_photos alter column category set default 'front';
