-- Allow users to self-manage their own channel membership rows.
-- This unblocks message sending when RLS requires is_channel_member(channel_id).

drop policy if exists "Channel members writable by board+" on public.channel_members;

create policy "Channel members writable by board+"
on public.channel_members
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Channel members self-manage"
on public.channel_members
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);