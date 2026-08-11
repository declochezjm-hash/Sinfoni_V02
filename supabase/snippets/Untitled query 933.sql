-- 1. Récupérer l'org_id de Marie Lefranc
SELECT id, email, organization_id FROM app.users WHERE email = 'm.lefranc@syndicat.fr';

-- 2. Vérifier les chantiers/projets associés à cette organisation
SELECT id, name, organization_id FROM app.projects; 

-- 3. Vérifier les interventions/tickets associés
SELECT id, title, organization_id FROM app.tickets_maintenance;