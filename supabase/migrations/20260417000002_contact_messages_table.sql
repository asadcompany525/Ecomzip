create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  subject text,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table contact_messages enable row level security;

drop policy if exists "Admin full access" on contact_messages;
create policy "Admin full access" on contact_messages
  for all using (true);
