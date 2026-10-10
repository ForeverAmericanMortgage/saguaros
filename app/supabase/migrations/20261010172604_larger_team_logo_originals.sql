-- Apply before releasing the direct-upload form. Private bucket and existing RLS stay unchanged.
alter table public.team_brand_assets drop constraint team_brand_assets_size_bytes_check;
alter table public.team_brand_assets add constraint team_brand_assets_size_bytes_check
 check (size_bytes between 1 and 20971520 and (content_type not in ('image/png','image/jpeg') or size_bytes <= 4194304));
update storage.buckets set file_size_limit = 20971520 where id = 'olympiad-team-logos';
