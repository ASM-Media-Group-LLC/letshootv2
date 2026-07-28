-- Clone shot list: add "hands" and "feet" categories (close-ups the LoRA needs
-- to render hands/feet correctly). Full plan now sums to 80 (= LORA_MAX).
alter table public.lora_photos drop constraint if exists lora_photos_category_check;
alter table public.lora_photos add constraint lora_photos_category_check
  check (category in ('front','left','right','expression','half','body','bikini','hands','feet','nude','face','other'));
