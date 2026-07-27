-- Clone shot list: add "bikini" (full body swimwear) and "nude" (optional,
-- upload-only) categories to the lora_photos check constraint.
alter table public.lora_photos drop constraint if exists lora_photos_category_check;
alter table public.lora_photos add constraint lora_photos_category_check
  check (category in ('front','left','right','expression','half','body','bikini','nude','face','other'));
