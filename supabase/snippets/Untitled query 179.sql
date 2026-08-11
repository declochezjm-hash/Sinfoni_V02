-- 1. Vérifier l'org_id de Marie Lefranc
SELECT id, email, organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr';

-- 2. Afficher toutes les colonnes sans risquer d'erreur 42703
SELECT * FROM app.projects LIMIT 5;
SELECT * FROM app.tickets_maintenance LIMIT 5;

-- 3. Réaligner le organization_id sur tous les chantiers et interventions
UPDATE app.projects 
SET organization_id = (SELECT organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr')
WHERE organization_id IS NULL OR organization_id != (SELECT organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr');

UPDATE app.tickets_maintenance 
SET organization_id = (SELECT organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr')
WHERE organization_id IS NULL OR organization_id != (SELECT organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr');