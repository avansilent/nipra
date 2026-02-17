create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.users add column if not exists name text;
alter table public.users add column if not exists role text;
alter table public.users add column if not exists created_at timestamptz;
alter table public.users drop column if exists email;
alter table public.users alter column role set default 'student';
alter table public.users alter column created_at set default timezone('utc', now());

alter table public.users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check
      check (role in ('student', 'admin'));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      'Student'
    ),
    'student'
  )
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
    from public.users
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

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content
  for select
  using (true);

drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content" on public.site_content
  for insert
  with check (public.is_admin());

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content
  for update
  using (public.is_admin());

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.enrollments (
  student_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, course_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  test_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.results (
  student_id uuid not null references public.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  marks numeric(6,2) not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, test_id)
);

alter table public.courses enable row level security;
alter table public.notes enable row level security;
alter table public.tests enable row level security;
alter table public.enrollments enable row level security;
alter table public.results enable row level security;

drop policy if exists "Users can read own user row" on public.users;
create policy "Users can read own user row" on public.users
  for select
  using (auth.uid() = id);

drop policy if exists "Admins can read all users" on public.users;
create policy "Admins can read all users" on public.users
  for select
  using (public.is_admin());

drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses" on public.courses
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage notes" on public.notes;
create policy "Admins can manage notes" on public.notes
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage tests" on public.tests;
create policy "Admins can manage tests" on public.tests
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated users can read courses" on public.courses;
create policy "Authenticated users can read courses" on public.courses
  for select
  using (auth.uid() is not null);

drop policy if exists "Authenticated users can read notes" on public.notes;
create policy "Authenticated users can read notes" on public.notes
  for select
  using (auth.uid() is not null);

drop policy if exists "Authenticated users can read tests" on public.tests;
create policy "Authenticated users can read tests" on public.tests
  for select
  using (auth.uid() is not null);

drop policy if exists "Students can read own enrollments" on public.enrollments;
create policy "Students can read own enrollments" on public.enrollments
  for select
  using (auth.uid() = student_id);

drop policy if exists "Admins can manage enrollments" on public.enrollments;
create policy "Admins can manage enrollments" on public.enrollments
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can read own results" on public.results;
create policy "Students can read own results" on public.results
  for select
  using (auth.uid() = student_id);

drop policy if exists "Admins can manage results" on public.results;
create policy "Admins can manage results" on public.results
  for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('notes', 'notes', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Admins manage notes bucket" on storage.objects;
create policy "Admins manage notes bucket" on storage.objects
  for all
  using (bucket_id = 'notes' and public.is_admin())
  with check (bucket_id = 'notes' and public.is_admin());

create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_notes_course_id on public.notes(course_id);
create index if not exists idx_tests_course_id on public.tests(course_id);
create index if not exists idx_results_test_id on public.results(test_id);
