-- Approved public teams can feature their already uploaded web-friendly logo.
alter table public.team_public_logos drop constraint team_public_logos_object_path_check;
alter table public.team_public_logos add constraint team_public_logos_image_path check (
 split_part(object_path,'/',2) ~ '^(web-)?[0-9a-f-]{36}[.](png|jpg|jpeg)$'
);
alter table public.team_public_logos drop constraint team_public_logos_check1;
alter table public.team_public_logos add constraint team_public_logos_image_extension check (
 (content_type='image/png' and object_path like '%.png') or
 (content_type='image/jpeg' and (object_path like '%.jpg' or object_path like '%.jpeg'))
);
insert into public.team_public_logos(team_id,object_path,content_type,updated_at)
select a.team_id,a.object_path,a.content_type,a.updated_at
from public.team_brand_assets a join public.team_directory d on d.id=a.team_id
where a.content_type in ('image/png','image/jpeg')
on conflict(team_id) do nothing;
