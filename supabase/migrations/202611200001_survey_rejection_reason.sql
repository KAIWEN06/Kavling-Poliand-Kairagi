alter table public.survey_requests
  add column if not exists rejection_reason text;
