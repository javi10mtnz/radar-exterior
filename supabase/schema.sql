-- Tabla para guardar el panel personal de cada usuario.
-- Pégalo en Supabase → SQL Editor → New query → Run.

create table if not exists public.panels (
  user_id uuid primary key references auth.users (id) on delete cascade,
  countries text[] not null default '{}',
  sectors text[] not null default '{}',
  types text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.panels enable row level security;

-- Cada persona solo puede ver y cambiar su propio panel.
create policy "Ver mi panel" on public.panels for select using (auth.uid() = user_id);
create policy "Crear mi panel" on public.panels for insert with check (auth.uid() = user_id);
create policy "Editar mi panel" on public.panels for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Borrar mi panel" on public.panels for delete using (auth.uid() = user_id);
