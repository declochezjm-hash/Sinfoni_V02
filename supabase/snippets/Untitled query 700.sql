SELECT 
    conname AS constraint_name, 
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'app' AND conrelid = 'app.projects'::regclass;