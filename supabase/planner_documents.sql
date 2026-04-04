create table if not exists public.planner_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"funds":[],"purchases":[],"sellItems":[],"disposalItems":[],"moveItems":[]}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.planner_documents enable row level security;

create or replace function public.set_planner_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_planner_documents_updated_at on public.planner_documents;

create trigger set_planner_documents_updated_at
before update on public.planner_documents
for each row
execute function public.set_planner_documents_updated_at();

drop policy if exists "Users can view their own planner document" on public.planner_documents;
create policy "Users can view their own planner document"
on public.planner_documents
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own planner document" on public.planner_documents;
create policy "Users can insert their own planner document"
on public.planner_documents
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own planner document" on public.planner_documents;
create policy "Users can update their own planner document"
on public.planner_documents
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
