
UPDATE projects p
SET checklist = sub.new_checklist
FROM (
  SELECT p2.id,
    (
      SELECT jsonb_agg(elem ORDER BY new_ord)
      FROM (
        SELECT elem,
          CASE
            WHEN elem->>'label' = 'Materialbeställning' THEN (
              SELECT ord2 + 0.5
              FROM jsonb_array_elements(p2.checklist) WITH ORDINALITY a2(e2, ord2)
              WHERE e2->>'label' = 'Ställningshantering'
              LIMIT 1
            )
            ELSE ord::numeric
          END AS new_ord
        FROM jsonb_array_elements(p2.checklist) WITH ORDINALITY arr(elem, ord)
      ) s
      WHERE new_ord IS NOT NULL
    ) AS new_checklist
  FROM projects p2
  WHERE p2.checklist IS NOT NULL
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(p2.checklist) e WHERE e->>'label' = 'Materialbeställning')
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(p2.checklist) e WHERE e->>'label' = 'Ställningshantering')
) sub
WHERE p.id = sub.id AND sub.new_checklist IS NOT NULL;
