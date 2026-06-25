-- Support multiple Squarespace sites in the same order/attribution pipeline.

alter table public.squarespace_orders
  add column if not exists source_key text not null default 'main';

update public.squarespace_orders
set source_key = 'main'
where source_key is null or btrim(source_key) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'squarespace_orders_source_key_not_empty'
      and conrelid = 'public.squarespace_orders'::regclass
  ) then
    alter table public.squarespace_orders
      add constraint squarespace_orders_source_key_not_empty check (length(btrim(source_key)) > 0);
  end if;
end $$;

alter table public.squarespace_orders
  drop constraint if exists squarespace_orders_squarespace_order_id_key;

create unique index if not exists idx_squarespace_orders_source_order_id
  on public.squarespace_orders(source_key, squarespace_order_id);

create index if not exists idx_squarespace_orders_source_created_on
  on public.squarespace_orders(source_key, created_on desc);

create index if not exists idx_squarespace_orders_source_referring_member
  on public.squarespace_orders(source_key, referring_member_raw)
  where referring_member_raw is not null;
