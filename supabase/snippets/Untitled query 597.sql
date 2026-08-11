DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Récupérer l'ID de l'organisation principale
    SELECT organization_id, id INTO v_org_id, v_user_id 
    FROM app.users 
    WHERE email = 'm.lefranc@syndicat.fr' 
    LIMIT 1;

    -- Si aucun utilisateur trouvé, prendre le premier utilisateur de la table
    IF v_org_id IS NULL THEN
        SELECT organization_id, id INTO v_org_id, v_user_id FROM app.users LIMIT 1;
    END IF;

    -- 2. Alignement immédiat de tous les chantiers/tickets existants sur cet organization_id
    UPDATE app.projects SET organization_id = v_org_id WHERE organization_id IS NULL OR organization_id != v_org_id;
    UPDATE app.tickets_maintenance SET organization_id = v_org_id WHERE organization_id IS NULL OR organization_id != v_org_id;

    -- 3. Injection des chantiers de démo avec la colonne reference renseignée
    IF NOT EXISTS (SELECT 1 FROM app.projects) THEN
        INSERT INTO app.projects (id, reference, title, status, organization_id, created_at)
        VALUES 
            (gen_random_uuid(), 'PRJ-2026-001', 'Rénovation Éclairage Public - Route de Banyuls', 'in_progress', v_org_id, NOW()),
            (gen_random_uuid(), 'PRJ-2026-002', 'Inspection Télévisée Réseau EU - Centre Bourg', 'planned', v_org_id, NOW()),
            (gen_random_uuid(), 'PRJ-2026-003', 'Mise en conformité AEP - Secteur Nord', 'completed', v_org_id, NOW());
    END IF;

    -- 4. Injection des tickets de démo (si la table est vide)
    IF NOT EXISTS (SELECT 1 FROM app.tickets_maintenance) THEN
        INSERT INTO app.tickets_maintenance (id, title, status, priority, organization_id, created_at)
        VALUES 
            (gen_random_uuid(), 'Remplacement lanterneau défectueux', 'open', 'high', v_org_id, NOW()),
            (gen_random_uuid(), 'Réparation fuite sous chaussée (AEP)', 'in_progress', 'urgent', v_org_id, NOW()),
            (gen_random_uuid(), 'Entretien préventif poste de refoulement', 'closed', 'normal', v_org_id, NOW());
    END IF;
END $$;

-- Purge du cache PostgREST
NOTIFY pgrst, 'reload schema';