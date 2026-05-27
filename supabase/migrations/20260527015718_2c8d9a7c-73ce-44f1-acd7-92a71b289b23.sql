UPDATE public.teams
SET members = jsonb_set(
  members,
  '{0}',
  (members->0) || jsonb_build_object(
    'user_id', 'f38d7cfe-e0d1-4450-8684-41e85722a834',
    'login_email', 'volodymyr@lokalahantverkarna.se'
  )
)
WHERE id = 'bbf0a8fa-39d4-4d41-9aa6-9f5c3a2e9a97'
  AND (members->0->>'firstName') = 'Volodymyr'
  AND (members->0->>'lastName') = 'Myschychyn'
  AND (members->0->>'user_id') IS NULL;