-- Captains explicitly publish a web image; print originals remain private.
create table public.team_public_logos (
 team_id uuid primary key references public.teams(id) on delete cascade,
 object_path text not null unique,
 content_type text not null check(content_type in ('image/png','image/jpeg')),
 updated_at timestamptz not null default now(),
 check(split_part(object_path,'/',1)=team_id::text),
 check(split_part(object_path,'/',2) ~ '^web-[0-9a-f-]{36}\.(png|jpg)$'),
 check((content_type='image/png' and object_path like '%.png') or (content_type='image/jpeg' and object_path like '%.jpg'))
);
alter table public.team_public_logos enable row level security;
grant select on public.team_public_logos to anon, authenticated;
grant insert,update,delete on public.team_public_logos to authenticated;
create policy public_team_logo_read on public.team_public_logos for select to anon,authenticated using (
 exists(select 1 from public.team_directory d where d.id=team_id)
);
create policy captain_web_logo_read on public.team_public_logos for select to authenticated using (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
create policy captain_public_logo_insert on public.team_public_logos for insert to authenticated with check (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
create policy captain_public_logo_update on public.team_public_logos for update to authenticated using (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
) with check (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
create policy captain_public_logo_delete on public.team_public_logos for delete to authenticated using (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
create policy published_web_logo_download on storage.objects for select to anon,authenticated using (
 bucket_id='olympiad-team-logos' and exists(
 select 1 from public.team_public_logos l join public.team_directory d on d.id=l.team_id
 where l.object_path=name and l.content_type in ('image/png','image/jpeg')
 )
);
