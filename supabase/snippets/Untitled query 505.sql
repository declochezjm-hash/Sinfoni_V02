ERROR:  23502: null value in column "reference" of relation "projects" violates not-null constraint

DETAIL:  Failing row contains (4279b294-d1b1-4622-854b-676213765628, 00000000-0000-0000-0000-000000000001, null, Rénovation Éclairage Public - Route de Banyuls, , null, in_progress, 0, 0, null, null, null, , , null, null, , 2026-07-28 15:59:56.1307+00, 2026-07-28 15:59:56.1307+00, null, null, Brouillon, 0, À émettre, f, f, f, null, null).

CONTEXT:  SQL statement "INSERT INTO app.projects (id, title, status, organization_id, created_at)


        VALUES 


            (gen_random_uuid(), 'Rénovation Éclairage Public - Route de Banyuls', 'in_progress', v_org_id, NOW()),


            (gen_random_uuid(), 'Inspection Télévisée Réseau EU - Centre Bourg', 'planned', v_org_id, NOW()),


            (gen_random_uuid(), 'Mise en conformité AEP - Secteur Nord', 'completed', v_org_id, NOW())"

PL/pgSQL function inline_code_block line 23 at SQL statement