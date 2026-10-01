-- Private originals for captain uploads and chairman production use.
create table public.team_brand_assets (
 team_id uuid primary key references public.teams(id) on delete cascade,
 object_path text not null unique,
 filename text not null check (length(filename) between 1 and 180),
 content_type text not null,
 size_bytes integer not null check (size_bytes between 1 and 4194304),
 uploaded_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 constraint team_logo_path check (split_part(object_path,'/',1) = team_id::text)
);
alter table public.team_brand_assets enable row level security;
revoke all on public.team_brand_assets from anon;
grant select,insert,update on public.team_brand_assets to authenticated;
create policy team_logo_read on public.team_brand_assets for select to authenticated using (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
 or exists(select 1 from public.organizer_memberships m where m.user_id=(select auth.uid()))
);
create policy team_logo_insert on public.team_brand_assets for insert to authenticated with check (
 uploaded_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
create policy team_logo_update on public.team_brand_assets for update to authenticated using (
 exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
) with check (
 uploaded_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
 'olympiad-team-logos','olympiad-team-logos',false,4194304,
 array['image/png','image/jpeg','image/svg+xml','application/pdf','application/postscript']
);
create policy captain_logo_upload on storage.objects for insert to authenticated with check (
 bucket_id='olympiad-team-logos' and exists(select 1 from public.teams t where t.id::text=(storage.foldername(name))[1] and t.captain_user_id=(select auth.uid()))
);
create policy private_logo_download on storage.objects for select to authenticated using (
 bucket_id='olympiad-team-logos' and (
 exists(select 1 from public.teams t where t.id::text=(storage.foldername(name))[1] and t.captain_user_id=(select auth.uid()))
 or exists(select 1 from public.organizer_memberships m where m.user_id=(select auth.uid()))
 )
);
