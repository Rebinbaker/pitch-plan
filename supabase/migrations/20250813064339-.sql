-- Remove duplicate scaffolding entries, keeping only one of each name
DELETE FROM scaffolding s1 
WHERE EXISTS (
    SELECT 1 FROM scaffolding s2 
    WHERE s2.name = s1.name 
    AND s2.id < s1.id
    AND s2.user_id = s1.user_id
);

-- Verify the cleanup
SELECT name, status, COUNT(*) as count 
FROM scaffolding 
GROUP BY name, status 
ORDER BY name;