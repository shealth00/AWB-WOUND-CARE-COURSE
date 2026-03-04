AWB Academy MVP

1. Web UI:

- Course catalog (by track)
- Lesson page: video embed + downloads
- Quiz page: pull questions from Smartsheet; score in API; show results
- Completion tracking; certificate generation; certificate verification page at /verify/{certificateId}

2. Smartsheet integration:

- Read AWB_COURSE_CATALOG and AWB_QUESTION_BANK nightly + on-demand
- Write quiz attempts to Postgres AND to AWB_USER_RESULTS
- Write form submissions to AWB_FORMS_SUBMISSIONS + attach uploaded files
- IVR endpoint that creates a row in AWB_IVR_INTAKE + attaches audio (if provided)
- Webhook receiver for Smartsheet change events (publish status, assignments, status changes)

3. Security:

- No PHI stored anywhere
- Secrets in env vars
- Audit log for admin actions
