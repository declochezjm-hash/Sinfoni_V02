DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Récupération de l'ID d'organisation
    SELECT organization_id, id INTO v_org_id, v_user_id 
    FROM app.users 
    WHERE email = 'm.lefranc@syndicat.fr' 
    LIMIT 1;

    IF v_org_id IS NULL THEN
        SELECT organization_id, id INTO v_org_id, v_user_id FROM app.users LIMIT 1;
    END IF;

    -- 2. Réalignement des enregistrements existants sur l'organisation
    UPDATE app.projects SET organization_id = v_org_id WHERE organization_id IS NULL OR organization_id != v_org_id;
    UPDATE app.tickets_maintenance SET organization_id = v_org_id WHERE organization_id IS NULL OR organization_id != v_org_id;

    -- 3. Injection des projets de démonstration conformes aux contraintes
    IF NOT EXISTS (SELECT 1 FROM app.projects) THEN
        INSERT INTO app.projects (id, reference, type, title, status, organization_id, created_at)
        VALUES 
            (gen_random_uuid(), 'PRJ-2026-001', 'Éclairage Public', 'Rénovation Éclairage Public - Route de Banyuls', 'En cours', v_org_id, NOW()),
            (gen_random_uuid(), 'PRJ-2026-002', 'Télécom', 'Inspection Télévisée Réseau EU - Centre Bourg', 'En Étude', v_org_id, NOW()),
            (gen_random_uuid(), 'PRJ-2026-003', 'IRVE', 'Mise en conformité Bornes - Secteur Nord', 'Clôturé', v_org_id, NOW());
    END IF;

    -- 4. Injection des tickets de démo (si la table est vide)
    IF NOT EXISTS (SELECT 1 FROM app.tickets_maintenance) THEN
        INSERT INTO app.tickets_maintenance (id, title, organization_id, created_at)
        VALUES 
            (gen_random_uuid(), 'Remplacement lanterneau défectueux', v_org_id, NOW()),
            (gen_random_uuid(), 'Réparation fuite sous chaussée (AEP)', v_org_id, NOW()),
            (gen_random_uuid(), 'Entretien préventif poste de refoulement', v_org_id, NOW());
    END IF;
END $$;

-- Purge du cache PostgREST pour mise à jour immédiate de l'API
NOTIFY pgrst, 'reload schema';