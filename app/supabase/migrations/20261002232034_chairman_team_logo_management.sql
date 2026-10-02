-- Reuse the existing verified Google chairman guard for logo management.
create policy chairman_original_logo_insert on public.team_brand_assets for insert to authenticated with check (
 uploaded_by=(select auth.uid()) and (select olympiad_private.chairman_access_allowed())
 and exists(select 1 from public.teams t where t.id=team_id)
);
create policy chairman_original_logo_update on public.team_brand_assets for update to authenticated using (
 (select olympiad_private.chairman_access_allowed())
) with check (
 uploaded_by=(select auth.uid()) and (select olympiad_private.chairman_access_allowed())
 and exists(select 1 from public.teams t where t.id=team_id)
);
create policy chairman_web_logo_read on public.team_public_logos for select to authenticated using ((select olympiad_private.chairman_access_allowed()));
create policy chairman_web_logo_insert on public.team_public_logos for insert to authenticated with check (
 (select olympiad_private.chairman_access_allowed()) and exists(select 1 from public.teams t where t.id=team_id)
);
create policy chairman_web_logo_update on public.team_public_logos for update to authenticated using (
 (select olympiad_private.chairman_access_allowed())
) with check (
 (select olympiad_private.chairman_access_allowed()) and exists(select 1 from public.teams t where t.id=team_id)
);
create policy chairman_web_logo_hide on public.team_public_logos for delete to authenticated using ((select olympiad_private.chairman_access_allowed()));
create policy chairman_team_logo_upload on storage.objects for insert to authenticated with check (
 bucket_id='olympiad-team-logos' and (select olympiad_private.chairman_access_allowed())
 and exists(select 1 from public.teams t where t.id::text=(storage.foldername(name))[1])
);
