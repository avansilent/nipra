create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable;

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_content enable row level security;

create policy "Public can read site content" on public.site_content
  for select
  using (true);

create policy "Admins can insert site content" on public.site_content
  for insert
  with check (public.is_admin());

create policy "Admins can update site content" on public.site_content
  for update
  using (public.is_admin());
