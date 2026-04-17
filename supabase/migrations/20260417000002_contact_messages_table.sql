create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Admin full access" on public.contact_messages;
drop policy if exists "Anyone can submit contact message" on public.contact_messages;
create policy "Anyone can submit contact message" on public.contact_messages
  for insert with check (true);

drop policy if exists "Admins and staff can view contact messages" on public.contact_messages;
create policy "Admins and staff can view contact messages" on public.contact_messages
  for select using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'moderator'::app_role)
  );

drop policy if exists "Admins and staff can update contact messages" on public.contact_messages;
create policy "Admins and staff can update contact messages" on public.contact_messages
  for update using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'moderator'::app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'moderator'::app_role)
  );
