create extension if not exists pgcrypto;

create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.institutes enable row level security;

drop policy if exists "Authenticated can read institutes" on public.institutes;
create policy "Authenticated can read institutes" on public.institutes
  for select
  using ((select auth.uid()) is not null);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student',
  institute_id uuid references public.institutes(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.profiles alter column role set default 'student';

alter table public.profiles enable row level security;

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

create or replace function public.get_my_institute_id()
returns uuid as $$
  select institute_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$ language sql stable security definer
set search_path = public, pg_temp;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer
set search_path = public, pg_temp;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  next_role text;
  next_institute_id uuid;
  next_subdomain text;
  next_institute_name text;
  invited_by_admin_id uuid;
begin
  next_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if next_role not in ('admin', 'student') then
    next_role := 'student';
  end if;

  if next_role = 'admin' then
    next_subdomain := lower(coalesce(new.raw_user_meta_data->>'subdomain', split_part(new.email, '@', 1)));
    next_subdomain := regexp_replace(next_subdomain, '[^a-z0-9-]', '', 'g');

    next_institute_name := coalesce(
      nullif(new.raw_user_meta_data->>'institute_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      initcap(replace(next_subdomain, '-', ' '))
    );

    insert into public.institutes (name, subdomain)
    values (next_institute_name, next_subdomain)
    on conflict (subdomain) do update
      set name = excluded.name
    returning id into next_institute_id;
  else
    begin
      if coalesce(new.raw_user_meta_data->>'institute_id', '') <> '' then
        next_institute_id := (new.raw_user_meta_data->>'institute_id')::uuid;
      end if;
    exception
      when others then
        next_institute_id := null;
    end;

    if next_institute_id is null and coalesce(new.raw_user_meta_data->>'subdomain', '') <> '' then
      select id into next_institute_id
      from public.institutes
      where subdomain = lower(new.raw_user_meta_data->>'subdomain')
      limit 1;
    end if;

    if next_institute_id is null and coalesce(new.raw_user_meta_data->>'invited_by_admin_id', '') <> '' then
      begin
        invited_by_admin_id := (new.raw_user_meta_data->>'invited_by_admin_id')::uuid;
      exception
        when others then
          invited_by_admin_id := null;
      end;

      if invited_by_admin_id is not null then
        select institute_id into next_institute_id
        from public.profiles
        where id = invited_by_admin_id
        limit 1;
      end if;
    end if;
  end if;

  insert into public.profiles (id, role, institute_id)
  values (new.id, next_role, next_institute_id)
  on conflict (id) do update
    set role = excluded.role,
        institute_id = coalesce(public.profiles.institute_id, excluded.institute_id);

  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      'Student'
    ),
    next_role
  )
  on conflict (id) do update
    set name = excluded.name,
        role = excluded.role;

  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.enrollments (
  student_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  enrolled_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, course_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  test_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.results (
  student_id uuid not null references public.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  marks numeric(6,2) not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, test_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  body text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.courses add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.enrollments add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.notes add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.materials add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.tests add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.results add column if not exists institute_id uuid references public.institutes(id) on delete set null;
alter table public.announcements add column if not exists institute_id uuid references public.institutes(id) on delete set null;

update public.notes n
set institute_id = (
  select c.institute_id
  from public.courses c
  where c.id = n.course_id
  limit 1
)
where n.institute_id is null;

update public.materials m
set institute_id = (
  select c.institute_id
  from public.courses c
  where c.id = m.course_id
  limit 1
)
where m.institute_id is null;

update public.tests t
set institute_id = (
  select c.institute_id
  from public.courses c
  where c.id = t.course_id
  limit 1
)
where t.institute_id is null;

update public.enrollments e
set institute_id = coalesce(
  (
    select p.institute_id
    from public.profiles p
    where p.id = e.student_id
    limit 1
  ),
  (
    select c.institute_id
    from public.courses c
    where c.id = e.course_id
    limit 1
  )
)
where e.institute_id is null;

update public.results r
set institute_id = coalesce(
  (
    select p.institute_id
    from public.profiles p
    where p.id = r.student_id
    limit 1
  ),
  (
    select t.institute_id
    from public.tests t
    where t.id = r.test_id
    limit 1
  ),
  (
    select e.institute_id
    from public.enrollments e
    where e.student_id = r.student_id
      and e.course_id = (
        select t2.course_id
        from public.tests t2
        where t2.id = r.test_id
        limit 1
      )
    limit 1
  )
)
where r.institute_id is null;

alter table public.courses enable row level security;
alter table public.notes enable row level security;
alter table public.materials enable row level security;
alter table public.tests enable row level security;
alter table public.enrollments enable row level security;
alter table public.results enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read institute profiles" on public.profiles;
drop policy if exists "Users and admins can read profiles" on public.profiles;
create policy "Users and admins can read profiles" on public.profiles
  for select
  using (
    (select auth.uid()) = id
    or (public.is_admin() and institute_id = public.get_my_institute_id())
  );

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update institute profiles" on public.profiles;
drop policy if exists "Users and admins can update profiles" on public.profiles;
create policy "Users and admins can update profiles" on public.profiles
  for update
  using (
    (select auth.uid()) = id
    or (public.is_admin() and institute_id = public.get_my_institute_id())
  )
  with check (
    (select auth.uid()) = id
    or (public.is_admin() and institute_id = public.get_my_institute_id())
  );

drop policy if exists "Users can read own user row" on public.users;
drop policy if exists "Admins can read all users" on public.users;
drop policy if exists "Users and admins can read users" on public.users;
create policy "Users and admins can read users" on public.users
  for select
  using (
    (select auth.uid()) = id
    or (
    public.is_admin()
    and exists (
      select 1
      from public.profiles p
      where p.id = public.users.id
        and p.institute_id = public.get_my_institute_id()
    )
    )
  );

drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Admins can insert courses" on public.courses;
drop policy if exists "Admins can update courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can insert courses" on public.courses
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update courses" on public.courses
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete courses" on public.courses
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Authenticated users can read courses" on public.courses;
create policy "Authenticated users can read courses" on public.courses
  for select
  using ((select auth.uid()) is not null and institute_id = public.get_my_institute_id());

drop policy if exists "Admins can manage notes" on public.notes;
drop policy if exists "Admins can insert notes" on public.notes;
drop policy if exists "Admins can update notes" on public.notes;
drop policy if exists "Admins can delete notes" on public.notes;
create policy "Admins can insert notes" on public.notes
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update notes" on public.notes
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete notes" on public.notes
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Authenticated users can read notes" on public.notes;
create policy "Authenticated users can read notes" on public.notes
  for select
  using ((select auth.uid()) is not null and institute_id = public.get_my_institute_id());

drop policy if exists "Admins can manage materials" on public.materials;
drop policy if exists "Admins can insert materials" on public.materials;
drop policy if exists "Admins can update materials" on public.materials;
drop policy if exists "Admins can delete materials" on public.materials;
create policy "Admins can insert materials" on public.materials
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update materials" on public.materials
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete materials" on public.materials
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Authenticated users can read materials" on public.materials;
create policy "Authenticated users can read materials" on public.materials
  for select
  using ((select auth.uid()) is not null and institute_id = public.get_my_institute_id());

drop policy if exists "Admins can manage tests" on public.tests;
drop policy if exists "Admins can insert tests" on public.tests;
drop policy if exists "Admins can update tests" on public.tests;
drop policy if exists "Admins can delete tests" on public.tests;
create policy "Admins can insert tests" on public.tests
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update tests" on public.tests
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete tests" on public.tests
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Authenticated users can read tests" on public.tests;
create policy "Authenticated users can read tests" on public.tests
  for select
  using ((select auth.uid()) is not null and institute_id = public.get_my_institute_id());

drop policy if exists "Students can read own enrollments" on public.enrollments;
drop policy if exists "Admins can manage enrollments" on public.enrollments;
drop policy if exists "Students and admins can read enrollments" on public.enrollments;
create policy "Students and admins can read enrollments" on public.enrollments
  for select
  using (
    ((select auth.uid()) = student_id or public.is_admin())
    and institute_id = public.get_my_institute_id()
  );

drop policy if exists "Admins can insert enrollments" on public.enrollments;
drop policy if exists "Admins can update enrollments" on public.enrollments;
drop policy if exists "Admins can delete enrollments" on public.enrollments;
create policy "Admins can insert enrollments" on public.enrollments
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update enrollments" on public.enrollments
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete enrollments" on public.enrollments
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Students can read own results" on public.results;
drop policy if exists "Admins can manage results" on public.results;
drop policy if exists "Students and admins can read results" on public.results;
create policy "Students and admins can read results" on public.results
  for select
  using (
    ((select auth.uid()) = student_id or public.is_admin())
    and institute_id = public.get_my_institute_id()
  );

drop policy if exists "Admins can insert results" on public.results;
drop policy if exists "Admins can update results" on public.results;
drop policy if exists "Admins can delete results" on public.results;
create policy "Admins can insert results" on public.results
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update results" on public.results
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete results" on public.results
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Admins can manage announcements" on public.announcements;
drop policy if exists "Admins can insert announcements" on public.announcements;
drop policy if exists "Admins can update announcements" on public.announcements;
drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can insert announcements" on public.announcements
  for insert
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can update announcements" on public.announcements
  for update
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

create policy "Admins can delete announcements" on public.announcements
  for delete
  using (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "Authenticated users can read announcements" on public.announcements;
create policy "Authenticated users can read announcements" on public.announcements
  for select
  using ((select auth.uid()) is not null and institute_id = public.get_my_institute_id());

insert into storage.buckets (id, name, public)
values ('notes', 'notes', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Admins manage notes bucket" on storage.objects;
create policy "Admins manage notes bucket" on storage.objects
  for all
  using (bucket_id = 'notes' and public.is_admin())
  with check (bucket_id = 'notes' and public.is_admin());

drop policy if exists "Admins manage materials bucket" on storage.objects;
create policy "Admins manage materials bucket" on storage.objects
  for all
  using (bucket_id = 'materials' and public.is_admin())
  with check (bucket_id = 'materials' and public.is_admin());

create index if not exists idx_profiles_institute_id on public.profiles(institute_id);
create index if not exists idx_courses_institute_id on public.courses(institute_id);
create index if not exists idx_enrollments_institute_id on public.enrollments(institute_id);
create index if not exists idx_notes_institute_id on public.notes(institute_id);
create index if not exists idx_materials_institute_id on public.materials(institute_id);
create index if not exists idx_tests_institute_id on public.tests(institute_id);
create index if not exists idx_results_institute_id on public.results(institute_id);
create index if not exists idx_announcements_institute_id on public.announcements(institute_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_notes_course_id on public.notes(course_id);
create index if not exists idx_materials_course_id on public.materials(course_id);
create index if not exists idx_tests_course_id on public.tests(course_id);
create index if not exists idx_results_test_id on public.results(test_id);
