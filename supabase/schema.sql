create extension if not exists pgcrypto;

create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.institutes add column if not exists name text;
alter table public.institutes add column if not exists subdomain text;
alter table public.institutes add column if not exists created_at timestamptz;
alter table public.institutes alter column created_at set default timezone('utc', now());

update public.institutes
set subdomain = coalesce(
  nullif(trim(both '-' from regexp_replace(lower(coalesce(name, 'institute')), '[^a-z0-9]+', '-', 'g')), ''),
  concat('institute-', left(replace(id::text, '-', ''), 8))
)
where coalesce(trim(subdomain), '') = '';

update public.institutes
set subdomain = concat(subdomain, '-', left(replace(id::text, '-', ''), 8))
where subdomain in (
  select subdomain
  from public.institutes
  where coalesce(trim(subdomain), '') <> ''
  group by subdomain
  having count(*) > 1
);

create unique index if not exists idx_institutes_subdomain_unique on public.institutes (subdomain);

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('student', 'admin'));
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.users add column if not exists name text;
alter table public.users add column if not exists role text;
alter table public.users add column if not exists created_at timestamptz;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists login_id text;
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

create unique index if not exists idx_users_email_unique on public.users (lower(email)) where email is not null;
create unique index if not exists idx_users_login_id_unique on public.users (lower(login_id)) where login_id is not null;

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
  next_role := lower(coalesce(new.raw_app_meta_data->>'role', 'student'));
  if next_role not in ('admin', 'student') then
    next_role := 'student';
  end if;

  if next_role = 'admin' then
    next_subdomain := lower(coalesce(new.raw_app_meta_data->>'subdomain', split_part(new.email, '@', 1)));
    next_subdomain := regexp_replace(next_subdomain, '[^a-z0-9-]', '', 'g');

    next_institute_name := coalesce(
      nullif(new.raw_app_meta_data->>'institute_name', ''),
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
      if coalesce(new.raw_app_meta_data->>'institute_id', '') <> '' then
        next_institute_id := (new.raw_app_meta_data->>'institute_id')::uuid;
      end if;
    exception
      when others then
        next_institute_id := null;
    end;

    if next_institute_id is null and coalesce(new.raw_app_meta_data->>'subdomain', '') <> '' then
      select id into next_institute_id
      from public.institutes
      where subdomain = lower(new.raw_app_meta_data->>'subdomain')
      limit 1;
    end if;

    if next_institute_id is null and coalesce(new.raw_app_meta_data->>'invited_by_admin_id', '') <> '' then
      begin
        invited_by_admin_id := (new.raw_app_meta_data->>'invited_by_admin_id')::uuid;
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
        role = excluded.role,
        email = coalesce(new.email, public.users.email),
        login_id = coalesce(
          nullif(new.raw_user_meta_data->>'login_id', ''),
          nullif(split_part(new.email, '@', 1), ''),
          public.users.login_id
        );

  update public.users
  set email = coalesce(new.email, email),
      login_id = coalesce(
        nullif(new.raw_user_meta_data->>'login_id', ''),
        nullif(split_part(new.email, '@', 1), ''),
        login_id
      )
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

do $$
declare
  only_institute_id uuid;
begin
  if (select count(*) from public.institutes) = 1 then
    select id into only_institute_id
    from public.institutes
    limit 1;

    update public.profiles
    set institute_id = only_institute_id
    where role = 'admin'
      and institute_id is null;
  end if;
end $$;

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_content add column if not exists updated_at timestamptz;
update public.site_content set updated_at = timezone('utc', now()) where updated_at is null;
alter table public.site_content alter column updated_at set default timezone('utc', now());

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
  price_text text,
  status text not null default 'draft',
  cta_label text not null default 'View Course',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists price_text text;
alter table public.courses add column if not exists status text not null default 'draft';
alter table public.courses add column if not exists cta_label text not null default 'View Course';
alter table public.courses add column if not exists created_at timestamptz;
update public.courses set created_at = timezone('utc', now()) where created_at is null;
alter table public.courses alter column created_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_status_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_status_check
      check (status in ('draft', 'published', 'archived'));
  end if;
end $$;

create table if not exists public.enrollments (
  student_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  enrolled_at timestamptz not null default timezone('utc', now()),
  access_status text not null default 'active',
  payment_status text not null default 'paid',
  access_ends_at timestamptz,
  payment_due_at timestamptz,
  last_payment_at timestamptz,
  primary key (student_id, course_id)
);

alter table public.enrollments add column if not exists enrolled_at timestamptz;
update public.enrollments set enrolled_at = timezone('utc', now()) where enrolled_at is null;
alter table public.enrollments alter column enrolled_at set default timezone('utc', now());
alter table public.enrollments alter column enrolled_at set not null;
alter table public.enrollments add column if not exists access_status text;
alter table public.enrollments add column if not exists payment_status text;
alter table public.enrollments add column if not exists access_ends_at timestamptz;
alter table public.enrollments add column if not exists payment_due_at timestamptz;
alter table public.enrollments add column if not exists last_payment_at timestamptz;
update public.enrollments set access_status = 'active' where access_status is null;
update public.enrollments set payment_status = 'paid' where payment_status is null;
alter table public.enrollments alter column access_status set default 'active';
alter table public.enrollments alter column access_status set not null;
alter table public.enrollments alter column payment_status set default 'paid';
alter table public.enrollments alter column payment_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_access_status_check'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_access_status_check
      check (access_status in ('active', 'payment_due', 'expired', 'completed', 'suspended'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_payment_status_check'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_payment_status_check
      check (payment_status in ('paid', 'due', 'overdue', 'pending'));
  end if;
end $$;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  file_url text not null,
  visibility text not null default 'student' check (visibility in ('public', 'student')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.notes add column if not exists title text;
alter table public.notes add column if not exists file_url text;
alter table public.notes add column if not exists created_at timestamptz;
update public.notes set created_at = timezone('utc', now()) where created_at is null;
alter table public.notes alter column created_at set default timezone('utc', now());

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  file_url text not null,
  visibility text not null default 'student' check (visibility in ('public', 'student')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.materials add column if not exists title text;
alter table public.materials add column if not exists file_url text;
alter table public.materials add column if not exists created_at timestamptz;
update public.materials set created_at = timezone('utc', now()) where created_at is null;
alter table public.materials alter column created_at set default timezone('utc', now());

alter table public.notes add column if not exists visibility text;
update public.notes set visibility = 'student' where visibility is null;
alter table public.notes alter column visibility set default 'student';
alter table public.notes alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_visibility_check'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_visibility_check
      check (visibility in ('public', 'student'));
  end if;
end $$;

alter table public.materials add column if not exists visibility text;
update public.materials set visibility = 'student' where visibility is null;
alter table public.materials alter column visibility set default 'student';
alter table public.materials alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_visibility_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_visibility_check
      check (visibility in ('public', 'student'));
  end if;
end $$;

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  test_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.tests add column if not exists title text;
alter table public.tests add column if not exists test_date date;
alter table public.tests add column if not exists created_at timestamptz;
update public.tests set created_at = timezone('utc', now()) where created_at is null;
alter table public.tests alter column created_at set default timezone('utc', now());

create table if not exists public.results (
  student_id uuid not null references public.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  institute_id uuid references public.institutes(id) on delete set null,
  marks numeric(6,2) not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, test_id)
);

alter table public.results add column if not exists marks numeric(6,2);
alter table public.results add column if not exists recorded_at timestamptz;
update public.results set recorded_at = timezone('utc', now()) where recorded_at is null;
alter table public.results alter column recorded_at set default timezone('utc', now());

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references public.institutes(id) on delete set null,
  title text not null,
  body text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.announcements add column if not exists title text;
alter table public.announcements add column if not exists body text;
alter table public.announcements add column if not exists created_by uuid references public.users(id) on delete set null;
alter table public.announcements add column if not exists created_at timestamptz;
update public.announcements set created_at = timezone('utc', now()) where created_at is null;
alter table public.announcements alter column created_at set default timezone('utc', now());

create table if not exists public.admission_payments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references public.institutes(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  order_id text not null unique,
  receipt text not null unique,
  payment_id text unique,
  signature text,
  student_user_id uuid references public.users(id) on delete set null,
  status text not null default 'created',
  student_name text not null,
  guardian_name text not null,
  phone text not null,
  email text,
  board text,
  class_level text not null,
  address text,
  interest text,
  amount_paise integer not null,
  amount_label text not null,
  currency text not null default 'INR',
  token_hash text not null unique,
  payment_method text,
  gateway_response jsonb,
  credentials_ciphertext text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  completed_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admission_payments_status_check'
      and conrelid = 'public.admission_payments'::regclass
  ) then
    alter table public.admission_payments
      add constraint admission_payments_status_check
      check (status in ('created', 'verified', 'paid', 'failed', 'credentials_issued'));
  end if;
end $$;

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

create or replace function public.enrollment_has_active_access(
  p_student_id uuid,
  p_course_id uuid,
  p_institute_id uuid
)
returns boolean as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id
      and e.course_id = p_course_id
      and e.institute_id = p_institute_id
      and coalesce(e.access_status, 'active') = 'active'
      and coalesce(e.payment_status, 'paid') = 'paid'
      and (e.access_ends_at is null or e.access_ends_at > timezone('utc', now()))
      and (e.payment_due_at is null or e.payment_due_at > timezone('utc', now()))
    limit 1
  );
$$ language sql stable security definer
set search_path = public, pg_temp;

alter table public.courses enable row level security;
alter table public.notes enable row level security;
alter table public.materials enable row level security;
alter table public.tests enable row level security;
alter table public.enrollments enable row level security;
alter table public.results enable row level security;
alter table public.announcements enable row level security;
alter table public.admission_payments enable row level security;

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
create policy "Admins can update institute profiles" on public.profiles
  for update
  using (
    public.is_admin()
    and institute_id = public.get_my_institute_id()
    and role = 'student'
  )
  with check (
    public.is_admin()
    and institute_id = public.get_my_institute_id()
    and role = 'student'
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
drop policy if exists "Users can read visible notes" on public.notes;
create policy "Users can read visible notes" on public.notes
  for select
  using (
    visibility = 'public'
    or (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and public.enrollment_has_active_access((select auth.uid()), public.notes.course_id, public.notes.institute_id)
    )
  );

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
drop policy if exists "Users can read visible materials" on public.materials;
create policy "Users can read visible materials" on public.materials
  for select
  using (
    (
      visibility = 'public'
      and file_url not like 'bunny-stream:%'
      and file_url not like 'cf-stream:%'
      and file_url not like 'r2-video:%'
    )
    or (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and public.enrollment_has_active_access((select auth.uid()), public.materials.course_id, public.materials.institute_id)
    )
  );

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
  using (
    (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and public.enrollment_has_active_access((select auth.uid()), public.tests.course_id, public.tests.institute_id)
    )
  );

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
    (
      public.is_admin()
      or (
        (select auth.uid()) = student_id
        and exists (
          select 1
          from public.tests t
          where t.id = public.results.test_id
            and public.enrollment_has_active_access((select auth.uid()), t.course_id, public.results.institute_id)
        )
      )
    )
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

drop policy if exists "Admins can read admission payments" on public.admission_payments;
create policy "Admins can read admission payments" on public.admission_payments
  for select
  using (public.is_admin() and institute_id = public.get_my_institute_id());

insert into storage.buckets (id, name, public)
values ('notes', 'notes', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
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

drop policy if exists "Public can read site assets bucket" on storage.objects;
create policy "Public can read site assets bucket" on storage.objects
  for select
  using (bucket_id = 'site-assets');

drop policy if exists "Admins manage site assets bucket" on storage.objects;
create policy "Admins manage site assets bucket" on storage.objects
  for all
  using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());

create index if not exists idx_profiles_institute_id on public.profiles(institute_id);
create index if not exists idx_courses_institute_id on public.courses(institute_id);
create index if not exists idx_enrollments_institute_id on public.enrollments(institute_id);
create index if not exists idx_notes_institute_id on public.notes(institute_id);
create index if not exists idx_materials_institute_id on public.materials(institute_id);
create index if not exists idx_tests_institute_id on public.tests(institute_id);
create index if not exists idx_results_institute_id on public.results(institute_id);
create index if not exists idx_announcements_institute_id on public.announcements(institute_id);
create index if not exists idx_admission_payments_institute_id on public.admission_payments(institute_id);
create index if not exists idx_admission_payments_course_id on public.admission_payments(course_id);
create index if not exists idx_admission_payments_status on public.admission_payments(status);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_enrollments_access_lookup on public.enrollments(student_id, course_id, institute_id, access_status, payment_status);
create index if not exists idx_enrollments_access_ends_at on public.enrollments(access_ends_at) where access_ends_at is not null;
create index if not exists idx_enrollments_payment_due_at on public.enrollments(payment_due_at) where payment_due_at is not null;
create index if not exists idx_notes_course_id on public.notes(course_id);
create index if not exists idx_materials_course_id on public.materials(course_id);
create index if not exists idx_tests_course_id on public.tests(course_id);
create index if not exists idx_results_test_id on public.results(test_id);

-- Online/offline class system - Phase 1 append only.
-- Live classes use direct Cloudflare Stream. Recorded videos use Cloudflare Stream.

alter table public.courses add column if not exists mode text;

update public.courses
set mode = 'offline'
where mode is null;

alter table public.courses alter column mode set default 'offline';
alter table public.courses alter column mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_mode_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_mode_check
      check (mode in ('online', 'offline', 'hybrid'));
  end if;
end $$;

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  live_provider text not null default 'other'
    check (live_provider in ('google_meet', 'zoom', 'other')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);

create index if not exists idx_class_sessions_institute on public.class_sessions(institute_id);
create index if not exists idx_class_sessions_course on public.class_sessions(course_id);
create index if not exists idx_class_sessions_date on public.class_sessions(session_date);
create index if not exists idx_class_sessions_status on public.class_sessions(status);

create table if not exists public.class_session_meeting_links (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  provider text not null default 'google_meet'
    check (provider in ('google_meet', 'zoom', 'other')),
  join_url text not null,
  host_url text,
  meeting_id text,
  passcode text,
  join_window_opens_at timestamptz,
  join_window_closes_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id),
  check (join_window_closes_at is null or join_window_opens_at is null or join_window_closes_at > join_window_opens_at)
);

create index if not exists idx_meeting_links_institute on public.class_session_meeting_links(institute_id);
create index if not exists idx_meeting_links_session on public.class_session_meeting_links(session_id);

create table if not exists public.session_recordings (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  recording_provider text not null default 'cloudflare_stream'
    check (recording_provider in ('cloudflare_stream', 'external_link', 'r2_video', 'bunny_stream')),
  title text,
  bunny_video_id text,
  bunny_library_id text,
  external_url text,
  available_from timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id)
);

create index if not exists idx_session_recordings_institute on public.session_recordings(institute_id);
create index if not exists idx_session_recordings_session on public.session_recordings(session_id);

alter table public.session_recordings alter column recording_provider set default 'cloudflare_stream';
alter table public.session_recordings drop constraint if exists session_recordings_recording_provider_check;
alter table public.session_recordings
  add constraint session_recordings_recording_provider_check
  check (recording_provider in ('cloudflare_stream', 'external_link', 'r2_video', 'bunny_stream'));

create table if not exists public.session_materials (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  material_type text not null check (material_type in ('note', 'book', 'link', 'pdf')),
  title text not null,
  description text,
  file_path text,
  external_url text,
  visible_from timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_session_materials_institute on public.session_materials(institute_id);
create index if not exists idx_session_materials_session on public.session_materials(session_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  file_path text,
  due_date timestamptz,
  max_marks integer not null default 100 check (max_marks > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_assignments_institute on public.assignments(institute_id);
create index if not exists idx_assignments_course on public.assignments(course_id);
create index if not exists idx_assignments_session on public.assignments(session_id);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  text_response text,
  file_path text,
  submitted_at timestamptz not null default timezone('utc', now()),
  marks_obtained numeric check (marks_obtained is null or marks_obtained >= 0),
  feedback text,
  graded_at timestamptz,
  graded_by uuid references public.profiles(id) on delete set null,
  unique (assignment_id, student_id)
);

create index if not exists idx_submissions_institute on public.assignment_submissions(institute_id);
create index if not exists idx_submissions_assignment on public.assignment_submissions(assignment_id);
create index if not exists idx_submissions_student on public.assignment_submissions(student_id);

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (session_id, student_id)
);

create index if not exists idx_attendance_institute on public.session_attendance(institute_id);
create index if not exists idx_attendance_session on public.session_attendance(session_id);
create index if not exists idx_attendance_student on public.session_attendance(student_id);

create or replace function public.set_online_class_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql
set search_path = public, pg_temp;

drop trigger if exists set_class_sessions_updated_at on public.class_sessions;
create trigger set_class_sessions_updated_at
  before update on public.class_sessions
  for each row execute procedure public.set_online_class_updated_at();

drop trigger if exists set_meeting_links_updated_at on public.class_session_meeting_links;
create trigger set_meeting_links_updated_at
  before update on public.class_session_meeting_links
  for each row execute procedure public.set_online_class_updated_at();

drop trigger if exists set_session_recordings_updated_at on public.session_recordings;
create trigger set_session_recordings_updated_at
  before update on public.session_recordings
  for each row execute procedure public.set_online_class_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at
  before update on public.assignments
  for each row execute procedure public.set_online_class_updated_at();

alter table public.class_sessions enable row level security;
alter table public.class_session_meeting_links enable row level security;
alter table public.session_recordings enable row level security;
alter table public.session_materials enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.session_attendance enable row level security;

drop policy if exists "admin_class_sessions_all" on public.class_sessions;
create policy "admin_class_sessions_all" on public.class_sessions
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "student_class_sessions_read" on public.class_sessions;
create policy "student_class_sessions_read" on public.class_sessions
  for select
  using (
    public.enrollment_has_active_access(
      (select auth.uid()),
      course_id,
      institute_id
    )
  );

drop policy if exists "admin_meeting_links_all" on public.class_session_meeting_links;
create policy "admin_meeting_links_all" on public.class_session_meeting_links
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_session_recordings_all" on public.session_recordings;
create policy "admin_session_recordings_all" on public.session_recordings
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_session_materials_all" on public.session_materials;
create policy "admin_session_materials_all" on public.session_materials
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_assignments_all" on public.assignments;
create policy "admin_assignments_all" on public.assignments
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_submissions_all" on public.assignment_submissions;
create policy "admin_submissions_all" on public.assignment_submissions
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_attendance_all" on public.session_attendance;
create policy "admin_attendance_all" on public.session_attendance
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "student_attendance_read_own" on public.session_attendance;
create policy "student_attendance_read_own" on public.session_attendance
  for select
  using (student_id = (select auth.uid()));

-- Admission learning mode and fee plan tracking - append only.
alter table public.admission_payments add column if not exists learning_mode text;
alter table public.admission_payments add column if not exists fee_plan text;
alter table public.admission_payments add column if not exists monthly_fee_label text;

update public.admission_payments
set learning_mode = 'offline'
where learning_mode is null;

update public.admission_payments
set fee_plan = 'admission'
where fee_plan is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admission_payments_learning_mode_check'
      and conrelid = 'public.admission_payments'::regclass
  ) then
    alter table public.admission_payments
      add constraint admission_payments_learning_mode_check
      check (learning_mode in ('offline', 'online'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admission_payments_fee_plan_check'
      and conrelid = 'public.admission_payments'::regclass
  ) then
    alter table public.admission_payments
      add constraint admission_payments_fee_plan_check
      check (fee_plan in ('admission', 'monthly', 'yearly'));
  end if;
end $$;

alter table public.enrollments add column if not exists learning_mode text;
alter table public.enrollments add column if not exists fee_plan text;
alter table public.enrollments add column if not exists fee_amount_label text;
alter table public.enrollments add column if not exists fee_amount_paise integer;

update public.enrollments
set learning_mode = 'offline'
where learning_mode is null;

update public.enrollments
set fee_plan = 'admission'
where fee_plan is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_learning_mode_check'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_learning_mode_check
      check (learning_mode in ('offline', 'online'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_fee_plan_check'
      and conrelid = 'public.enrollments'::regclass
  ) then
    alter table public.enrollments
      add constraint enrollments_fee_plan_check
      check (fee_plan in ('admission', 'monthly', 'yearly'));
  end if;
end $$;

create index if not exists idx_admission_payments_learning_mode on public.admission_payments(learning_mode, fee_plan);
create index if not exists idx_enrollments_learning_mode on public.enrollments(learning_mode, fee_plan);

-- Shared server-side rate limit ledger. Application routes use this table with
-- the service role key so limits survive server restarts and multi-instance deploys.
create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  hit_at timestamptz not null default timezone('utc', now())
);

alter table public.rate_limit_events enable row level security;

create index if not exists idx_rate_limit_events_bucket_hit_at
  on public.rate_limit_events(bucket_key, hit_at);

create index if not exists idx_rate_limit_events_hit_at
  on public.rate_limit_events(hit_at);

-- MCQ test series system - append only.
-- Existing tests/results continue to work. These columns add timed MCQ attempts.
alter table public.tests add column if not exists description text;
alter table public.tests add column if not exists starts_at timestamptz;
alter table public.tests add column if not exists ends_at timestamptz;
alter table public.tests add column if not exists duration_minutes integer;
alter table public.tests add column if not exists default_marks_per_question numeric(6,2);
alter table public.tests add column if not exists is_published boolean;
alter table public.tests add column if not exists is_free boolean;
alter table public.tests add column if not exists updated_at timestamptz;

update public.tests
set starts_at = (test_date::timestamp at time zone 'Asia/Kolkata')
where starts_at is null and test_date is not null;

update public.tests set duration_minutes = 30 where duration_minutes is null;
update public.tests set default_marks_per_question = 1 where default_marks_per_question is null;
update public.tests set is_published = true where is_published is null;
update public.tests set is_free = true where is_free is null;
update public.tests set updated_at = timezone('utc', now()) where updated_at is null;

alter table public.tests alter column duration_minutes set default 30;
alter table public.tests alter column duration_minutes set not null;
alter table public.tests alter column default_marks_per_question set default 1;
alter table public.tests alter column default_marks_per_question set not null;
alter table public.tests alter column is_published set default false;
alter table public.tests alter column is_published set not null;
alter table public.tests alter column is_free set default true;
alter table public.tests alter column is_free set not null;
alter table public.tests alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_duration_minutes_check'
      and conrelid = 'public.tests'::regclass
  ) then
    alter table public.tests
      add constraint tests_duration_minutes_check
      check (duration_minutes between 1 and 360);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_default_marks_check'
      and conrelid = 'public.tests'::regclass
  ) then
    alter table public.tests
      add constraint tests_default_marks_check
      check (default_marks_per_question > 0 and default_marks_per_question <= 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_window_check'
      and conrelid = 'public.tests'::regclass
  ) then
    alter table public.tests
      add constraint tests_window_check
      check (ends_at is null or starts_at is null or ends_at > starts_at);
  end if;
end $$;

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_option_index integer not null,
  marks numeric(6,2) not null default 1,
  explanation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(options) = 'array'),
  check (jsonb_array_length(options) between 2 and 6),
  check (correct_option_index >= 0 and correct_option_index < jsonb_array_length(options)),
  check (marks > 0 and marks <= 100)
);

alter table public.test_questions add column if not exists institute_id uuid references public.institutes(id) on delete cascade;
alter table public.test_questions add column if not exists test_id uuid references public.tests(id) on delete cascade;
alter table public.test_questions add column if not exists prompt text;
alter table public.test_questions add column if not exists options jsonb;
alter table public.test_questions add column if not exists correct_option_index integer;
alter table public.test_questions add column if not exists marks numeric(6,2);
alter table public.test_questions add column if not exists explanation text;
alter table public.test_questions add column if not exists sort_order integer;
alter table public.test_questions add column if not exists created_at timestamptz;
alter table public.test_questions add column if not exists updated_at timestamptz;
update public.test_questions set marks = 1 where marks is null;
update public.test_questions set sort_order = 0 where sort_order is null;
update public.test_questions set created_at = timezone('utc', now()) where created_at is null;
update public.test_questions set updated_at = timezone('utc', now()) where updated_at is null;
alter table public.test_questions alter column marks set default 1;
alter table public.test_questions alter column marks set not null;
alter table public.test_questions alter column sort_order set default 0;
alter table public.test_questions alter column sort_order set not null;
alter table public.test_questions alter column created_at set default timezone('utc', now());
alter table public.test_questions alter column created_at set not null;
alter table public.test_questions alter column updated_at set default timezone('utc', now());
alter table public.test_questions alter column updated_at set not null;

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'in_progress',
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  score numeric(8,2),
  total_marks numeric(8,2),
  percentage numeric(5,2),
  correct_count integer,
  question_count integer,
  warning_count integer not null default 0,
  last_warning_at timestamptz,
  warning_events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (test_id, student_id),
  check (status in ('in_progress', 'submitted', 'expired')),
  check (warning_count >= 0),
  check (question_count is null or question_count >= 0),
  check (correct_count is null or correct_count >= 0),
  check (percentage is null or (percentage >= 0 and percentage <= 100))
);

alter table public.test_attempts add column if not exists institute_id uuid references public.institutes(id) on delete cascade;
alter table public.test_attempts add column if not exists test_id uuid references public.tests(id) on delete cascade;
alter table public.test_attempts add column if not exists student_id uuid references public.users(id) on delete cascade;
alter table public.test_attempts add column if not exists status text;
alter table public.test_attempts add column if not exists started_at timestamptz;
alter table public.test_attempts add column if not exists submitted_at timestamptz;
alter table public.test_attempts add column if not exists answers jsonb;
alter table public.test_attempts add column if not exists score numeric(8,2);
alter table public.test_attempts add column if not exists total_marks numeric(8,2);
alter table public.test_attempts add column if not exists percentage numeric(5,2);
alter table public.test_attempts add column if not exists correct_count integer;
alter table public.test_attempts add column if not exists question_count integer;
alter table public.test_attempts add column if not exists warning_count integer;
alter table public.test_attempts add column if not exists last_warning_at timestamptz;
alter table public.test_attempts add column if not exists warning_events jsonb;
alter table public.test_attempts add column if not exists created_at timestamptz;
alter table public.test_attempts add column if not exists updated_at timestamptz;
update public.test_attempts set status = 'in_progress' where status is null;
update public.test_attempts set started_at = timezone('utc', now()) where started_at is null;
update public.test_attempts set answers = '{}'::jsonb where answers is null;
update public.test_attempts set warning_count = 0 where warning_count is null;
update public.test_attempts set warning_events = '[]'::jsonb where warning_events is null;
update public.test_attempts set created_at = timezone('utc', now()) where created_at is null;
update public.test_attempts set updated_at = timezone('utc', now()) where updated_at is null;
alter table public.test_attempts alter column status set default 'in_progress';
alter table public.test_attempts alter column status set not null;
alter table public.test_attempts alter column started_at set default timezone('utc', now());
alter table public.test_attempts alter column started_at set not null;
alter table public.test_attempts alter column answers set default '{}'::jsonb;
alter table public.test_attempts alter column answers set not null;
alter table public.test_attempts alter column warning_count set default 0;
alter table public.test_attempts alter column warning_count set not null;
alter table public.test_attempts alter column warning_events set default '[]'::jsonb;
alter table public.test_attempts alter column warning_events set not null;
alter table public.test_attempts alter column created_at set default timezone('utc', now());
alter table public.test_attempts alter column created_at set not null;
alter table public.test_attempts alter column updated_at set default timezone('utc', now());
alter table public.test_attempts alter column updated_at set not null;

create or replace function public.set_test_series_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql
set search_path = public, pg_temp;

drop trigger if exists set_tests_updated_at on public.tests;
create trigger set_tests_updated_at
  before update on public.tests
  for each row execute procedure public.set_test_series_updated_at();

drop trigger if exists set_test_questions_updated_at on public.test_questions;
create trigger set_test_questions_updated_at
  before update on public.test_questions
  for each row execute procedure public.set_test_series_updated_at();

drop trigger if exists set_test_attempts_updated_at on public.test_attempts;
create trigger set_test_attempts_updated_at
  before update on public.test_attempts
  for each row execute procedure public.set_test_series_updated_at();

alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;

drop policy if exists "admin_test_questions_all" on public.test_questions;
create policy "admin_test_questions_all" on public.test_questions
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "admin_test_attempts_all" on public.test_attempts;
create policy "admin_test_attempts_all" on public.test_attempts
  for all
  using (public.is_admin() and institute_id = public.get_my_institute_id())
  with check (public.is_admin() and institute_id = public.get_my_institute_id());

drop policy if exists "student_test_attempts_read_own" on public.test_attempts;
create policy "student_test_attempts_read_own" on public.test_attempts
  for select
  using (
    student_id = (select auth.uid())
    and institute_id = public.get_my_institute_id()
  );

drop policy if exists "Authenticated users can read tests" on public.tests;
create policy "Authenticated users can read tests" on public.tests
  for select
  using (
    (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and is_published
      and (
        is_free
        or public.enrollment_has_active_access((select auth.uid()), public.tests.course_id, public.tests.institute_id)
      )
    )
  );

create index if not exists idx_tests_published_window on public.tests(institute_id, is_published, starts_at, ends_at);
create index if not exists idx_tests_free on public.tests(institute_id, is_free) where is_free = true;
create index if not exists idx_test_questions_test_order on public.test_questions(test_id, sort_order);
create index if not exists idx_test_questions_institute on public.test_questions(institute_id);
create index if not exists idx_test_attempts_test on public.test_attempts(test_id);
create index if not exists idx_test_attempts_student on public.test_attempts(student_id);
create index if not exists idx_test_attempts_institute on public.test_attempts(institute_id);
create index if not exists idx_test_attempts_warning_count on public.test_attempts(institute_id, warning_count);

-- Test audience scope.
-- all_students = any logged-in student in the institute can attend when the test is free.
-- course_students = only active students from the selected course can attend.
alter table public.tests add column if not exists audience_scope text;

update public.tests
set audience_scope = case
  when is_free = true then 'all_students'
  else 'course_students'
end
where audience_scope is null;

alter table public.tests alter column audience_scope set default 'all_students';
alter table public.tests alter column audience_scope set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_audience_scope_check'
      and conrelid = 'public.tests'::regclass
  ) then
    alter table public.tests
      add constraint tests_audience_scope_check
      check (audience_scope in ('all_students', 'course_students'));
  end if;
end $$;

drop policy if exists "Authenticated users can read tests" on public.tests;
create policy "Authenticated users can read tests" on public.tests
  for select
  using (
    (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and is_published
      and (
        (is_free and audience_scope = 'all_students')
        or public.enrollment_has_active_access((select auth.uid()), public.tests.course_id, public.tests.institute_id)
      )
    )
  );

create index if not exists idx_tests_audience_scope on public.tests(institute_id, audience_scope, is_free, is_published);
