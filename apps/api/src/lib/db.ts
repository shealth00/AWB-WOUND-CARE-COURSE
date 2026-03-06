import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { apiEnv } from "../env.js";

export const pool = new Pool({
  connectionString: apiEnv.DATABASE_URL,
});

export async function initializeDatabase(): Promise<void> {
  await pool.query(`
    create table if not exists content_lessons (
      lesson_id text primary key,
      source_row_id text unique,
      track text not null,
      module_id text not null,
      module_title text not null,
      lesson_title text not null,
      video_url text,
      duration_min integer,
      objectives jsonb not null default '[]'::jsonb,
      downloads jsonb not null default '[]'::jsonb,
      publish_status text not null default 'Draft',
      version text,
      owner text,
      synced_at timestamptz not null default now()
    );

    create index if not exists idx_content_lessons_track_module on content_lessons (track, module_id);

    create table if not exists question_bank (
      id bigserial primary key,
      source_row_id text unique,
      track text not null,
      module_id text not null,
      difficulty integer not null default 1,
      question_type text not null,
      stem text not null,
      options jsonb not null default '[]'::jsonb,
      correct_answer text not null,
      rationale text,
      tags jsonb not null default '[]'::jsonb,
      active boolean not null default true,
      version text,
      synced_at timestamptz not null default now()
    );

    create index if not exists idx_question_bank_track_module on question_bank (track, module_id);

    create table if not exists quiz_attempts (
      attempt_id text primary key,
      user_id text not null,
      track text not null,
      track_id text,
      module_id text not null,
      attempt_number integer not null,
      score integer not null,
      pass_fail boolean not null,
      time_spent_sec integer not null,
      completed_at timestamptz not null,
      question_count integer not null,
      correct_count integer not null,
      answers jsonb not null default '[]'::jsonb,
      certificate_id text
    );

    create index if not exists idx_quiz_attempts_user_track on quiz_attempts (user_id, track);

    create table if not exists certificates (
      id text unique,
      certificate_id text primary key,
      user_id text not null,
      learner_full_name text,
      learner_email text,
      track text not null,
      course_track text,
      track_id text,
      course_title text,
      completion_date date,
      module_id text not null,
      attempt_id text not null references quiz_attempts(attempt_id) on delete cascade,
      score integer not null,
      score_final_exam integer,
      status text not null default 'valid',
      issued_at timestamptz not null,
      revoked_at timestamptz,
      revoked_reason text,
      pdf_url text,
      pdf_storage_url text,
      created_by text not null default 'system'
    );

    create table if not exists form_submissions (
      submission_id text primary key,
      submission_type text not null,
      site_type text not null,
      facility_name text not null,
      case_id text not null,
      status text not null default 'New',
      assigned_to text,
      notes text,
      attachments jsonb not null default '[]'::jsonb,
      smartsheet_row_id text,
      created_at timestamptz not null default now()
    );

    create table if not exists ivr_intakes (
      intake_id text primary key,
      call_id text unique not null,
      caller_type text not null,
      site text not null,
      callback_number text not null,
      wound_type text not null,
      red_flags jsonb not null default '[]'::jsonb,
      request_type text not null,
      priority text not null,
      assigned_to text not null,
      status text not null default 'New',
      next_action_due timestamptz not null,
      audio_attachments jsonb not null default '[]'::jsonb,
      smartsheet_row_id text,
      created_at timestamptz not null default now()
    );

    create table if not exists audit_logs (
      audit_id text primary key,
      actor text not null,
      role text not null,
      action text not null,
      entity_type text not null,
      entity_id text not null,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists webhook_events (
      webhook_event_id text primary key,
      webhook_id text,
      event_type text not null,
      scope_object_id text,
      payload jsonb not null default '{}'::jsonb,
      received_at timestamptz not null default now()
    );

    create table if not exists sync_runs (
      sync_run_id text primary key,
      source text not null,
      status text not null,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists lesson_progress (
      progress_id text primary key,
      user_id text not null,
      track_id text not null,
      lesson_id text not null,
      watched_seconds integer not null default 0,
      total_seconds integer not null default 0,
      completed boolean not null default false,
      completed_at timestamptz,
      unique (user_id, lesson_id)
    );

    create table if not exists practical_assignments (
      assignment_id text primary key,
      user_id text not null,
      track_id text not null,
      submission_type text not null,
      rubric_score integer not null,
      status text not null default 'submitted',
      submitted_at timestamptz not null default now()
    );

    create table if not exists members (
      member_id text primary key,
      email text not null unique,
      password_hash text not null,
      first_name text,
      last_name text,
      role text not null default 'member',
      membership_status text not null default 'active',
      created_at timestamptz not null default now()
    );

    create index if not exists idx_members_email on members (email);

    create table if not exists member_sessions (
      session_id text primary key,
      member_id text not null references members(member_id) on delete cascade,
      token_hash text not null,
      ip_address text,
      user_agent text,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_member_sessions_member on member_sessions (member_id, created_at desc);

    create table if not exists media_assets (
      asset_id text primary key,
      title text not null,
      description text,
      media_type text not null,
      mime_type text not null,
      file_ext text not null,
      file_size bigint not null,
      storage_path text not null unique,
      storage_name text not null,
      duration_sec integer,
      page_count integer,
      processing_status text not null default 'ready',
      processing_notes text,
      created_by text not null default 'system',
      created_at timestamptz not null default now()
    );

    create index if not exists idx_media_assets_type_created_at on media_assets (media_type, created_at desc);

    create table if not exists video_generation_jobs (
      job_id text primary key,
      lesson_id text,
      source_row_id text,
      asset_id text references media_assets(asset_id) on delete set null,
      status text not null default 'queued',
      voice_id text not null default 'Joanna',
      request_payload jsonb not null default '{}'::jsonb,
      warnings jsonb not null default '[]'::jsonb,
      error_message text,
      created_by text not null default 'system',
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_video_generation_jobs_created_at on video_generation_jobs (created_at desc);
    create index if not exists idx_video_generation_jobs_status on video_generation_jobs (status, created_at desc);

    create table if not exists verification_lookups (
      lookup_id text primary key,
      certificate_id text not null,
      ip_address text,
      user_agent text,
      requested_at timestamptz not null default now()
    );

    alter table quiz_attempts add column if not exists track_id text;
    alter table content_lessons add column if not exists source_row_id text;
    alter table certificates add column if not exists id text;
    alter table certificates add column if not exists learner_full_name text;
    alter table certificates add column if not exists learner_email text;
    alter table certificates add column if not exists course_track text;
    alter table certificates add column if not exists track_id text;
    alter table certificates add column if not exists course_title text;
    alter table certificates add column if not exists completion_date date;
    alter table certificates add column if not exists score_final_exam integer;
    alter table certificates add column if not exists revoked_at timestamptz;
    alter table certificates add column if not exists revoked_reason text;
    alter table certificates add column if not exists pdf_url text;
    alter table certificates add column if not exists pdf_storage_url text;
    alter table certificates add column if not exists created_by text;
    alter table media_assets add column if not exists description text;
    alter table media_assets add column if not exists duration_sec integer;
    alter table media_assets add column if not exists page_count integer;
    alter table media_assets add column if not exists processing_status text not null default 'ready';
    alter table media_assets add column if not exists processing_notes text;
    alter table media_assets add column if not exists created_by text not null default 'system';
    alter table video_generation_jobs add column if not exists lesson_id text;
    alter table video_generation_jobs add column if not exists source_row_id text;
    alter table video_generation_jobs add column if not exists asset_id text references media_assets(asset_id) on delete set null;
    alter table video_generation_jobs add column if not exists status text not null default 'queued';
    alter table video_generation_jobs add column if not exists voice_id text not null default 'Joanna';
    alter table video_generation_jobs add column if not exists request_payload jsonb not null default '{}'::jsonb;
    alter table video_generation_jobs add column if not exists warnings jsonb not null default '[]'::jsonb;
    alter table video_generation_jobs add column if not exists error_message text;
    alter table video_generation_jobs add column if not exists created_by text not null default 'system';
    alter table video_generation_jobs add column if not exists started_at timestamptz;
    alter table video_generation_jobs add column if not exists completed_at timestamptz;
    create index if not exists idx_video_generation_jobs_created_at on video_generation_jobs (created_at desc);
    create index if not exists idx_video_generation_jobs_status on video_generation_jobs (status, created_at desc);

    update certificates
    set id = coalesce(id, certificate_id),
        learner_full_name = coalesce(learner_full_name, user_id),
        course_track = coalesce(course_track, track),
        completion_date = coalesce(completion_date, issued_at::date),
        score_final_exam = coalesce(score_final_exam, score),
        created_by = coalesce(created_by, 'system')
    where id is null
       or learner_full_name is null
       or course_track is null
       or completion_date is null
       or score_final_exam is null
       or created_by is null;
  `);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  client?: PoolClient,
): Promise<T[]> {
  const executor = client ?? pool;
  const result = await executor.query<T>(sql, values);
  return result.rows;
}

export async function insertAuditLog(input: {
  actor: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `
      insert into audit_logs (audit_id, actor, role, action, entity_type, entity_id, details)
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      randomUUID(),
      input.actor,
      input.role,
      input.action,
      input.entityType,
      input.entityId,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

export async function recordSyncRun(source: string, status: string, details: Record<string, unknown>) {
  await query(
    `
      insert into sync_runs (sync_run_id, source, status, details)
      values ($1, $2, $3, $4::jsonb)
    `,
    [randomUUID(), source, status, JSON.stringify(details)],
  );
}

export async function insertVerificationLookup(input: {
  certificateId: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  await query(
    `
      insert into verification_lookups (lookup_id, certificate_id, ip_address, user_agent)
      values ($1, $2, $3, $4)
    `,
    [randomUUID(), input.certificateId, input.ipAddress, input.userAgent],
  );
}
