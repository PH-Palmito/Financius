create table if not exists public.user_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assets jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_portfolios enable row level security;

create policy "Users can read their own portfolio"
on public.user_portfolios
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own portfolio"
on public.user_portfolios
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own portfolio"
on public.user_portfolios
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
