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

drop policy if exists "Authenticated users can read materials" on public.materials;
drop policy if exists "Users can read visible materials" on public.materials;
create policy "Users can read visible materials" on public.materials
  for select
  using (
    (visibility = 'public' and file_url not like 'bunny-stream:%')
    or (public.is_admin() and institute_id = public.get_my_institute_id())
    or (
      (select auth.uid()) is not null
      and institute_id = public.get_my_institute_id()
      and public.enrollment_has_active_access((select auth.uid()), public.materials.course_id, public.materials.institute_id)
    )
  );

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

create index if not exists idx_enrollments_access_lookup on public.enrollments(student_id, course_id, institute_id, access_status, payment_status);
create index if not exists idx_enrollments_access_ends_at on public.enrollments(access_ends_at) where access_ends_at is not null;
create index if not exists idx_enrollments_payment_due_at on public.enrollments(payment_due_at) where payment_due_at is not null;
