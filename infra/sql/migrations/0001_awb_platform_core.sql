-- Core identity and access
create table if not exists users (
  id uuid primary key,
  cognito_sub text unique not null,
  email text unique not null,
  first_name text,
  last_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key,
  code text unique not null,
  name text not null
);

create table if not exists user_roles (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table if not exists plans (
  id uuid primary key,
  code text unique not null,
  name text not null,
  billing_interval text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now()
);

-- Courses and learning content
create table if not exists courses (
  id uuid primary key,
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  status text not null default 'draft',
  visibility text not null default 'private',
  estimated_minutes integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_sections (
  id uuid primary key,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create table if not exists lessons (
  id uuid primary key,
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid references course_sections(id) on delete set null,
  slug text not null,
  title text not null,
  lesson_type text not null,
  body_json jsonb not null default '{}'::jsonb,
  required_for_completion boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'draft',
  published_at timestamptz,
  unique (course_id, slug)
);

create table if not exists assets (
  id uuid primary key,
  asset_type text not null,
  storage_key text not null unique,
  original_filename text not null,
  mime_type text not null,
  bytes bigint not null,
  title text,
  description text,
  duration_seconds integer,
  processing_status text not null,
  version integer not null default 1,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists lesson_assets (
  id uuid primary key,
  lesson_id uuid not null references lessons(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  role text not null,
  sort_order integer not null default 0,
  unique (lesson_id, asset_id, role)
);

-- Assessment and certification
create table if not exists quizzes (
  id uuid primary key,
  slug text unique not null,
  title text not null,
  passing_score numeric not null,
  status text not null default 'draft'
);

create table if not exists quiz_attempts (
  id uuid primary key,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  passed boolean,
  status text not null default 'in_progress'
);

create table if not exists certificates (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  certificate_number text unique not null,
  verification_token text unique not null,
  issued_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'valid'
);

create table if not exists audit_logs (
  id uuid primary key,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
