UPDATE public.teams
SET members = (
  SELECT jsonb_agg(
    CASE
      WHEN m->>'id' = 'member-1779057786844'
        THEN m || jsonb_build_object('user_id', '13a7d38d-2fb0-4835-970d-029e2ae46634', 'login_email', 'michels@lokalahantverkarna.se')
      ELSE m
    END
  )
  FROM jsonb_array_elements(members) m
)
WHERE id = 'eaf94bc1-772a-435f-b4c5-bfad41982469';