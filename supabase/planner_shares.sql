create table if not exists public.planner_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{"funds":[],"purchases":[],"sellItems":[],"disposalItems":[],"moveItems":[]}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.planner_shares enable row level security;

create or replace function public.set_planner_shares_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_planner_shares_updated_at on public.planner_shares;

create trigger set_planner_shares_updated_at
before update on public.planner_shares
for each row
execute function public.set_planner_shares_updated_at();

drop policy if exists "Users can view their own planner shares" on public.planner_shares;
create policy "Users can view their own planner shares"
on public.planner_shares
for select
using (auth.uid() = owner_user_id);

drop policy if exists "Users can insert their own planner shares" on public.planner_shares;
create policy "Users can insert their own planner shares"
on public.planner_shares
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "Users can update their own planner shares" on public.planner_shares;
create policy "Users can update their own planner shares"
on public.planner_shares
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Users can delete their own planner shares" on public.planner_shares;
create policy "Users can delete their own planner shares"
on public.planner_shares
for delete
using (auth.uid() = owner_user_id);

create or replace function public.get_planner_share(share_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', planner_shares.id,
    'snapshot', planner_shares.snapshot,
    'created_at', planner_shares.created_at,
    'updated_at', planner_shares.updated_at
  )
  from public.planner_shares
  where planner_shares.id = share_id
    and planner_shares.is_active = true
  limit 1;
$$;

grant execute on function public.get_planner_share(uuid) to anon, authenticated;
