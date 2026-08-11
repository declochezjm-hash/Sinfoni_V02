---
name: sinfoni
description: >-
  Guide complet du projet Sinfoni (GSI Concept) : application React/Supabase de
  gestion d'affaires énergétiques pour syndicat et portail commune. Couvre
  affaires, GED, carte SIG, patrimoine IRVE/éclairage, BPU, PDF, portail
  commune, rôles et migrations. À utiliser pour toute tâche sur Sinfoni, le
  syndicat d'énergie, les communes, l'import/export Shapefile ou l'architecture
  multi-tenant Supabase.
---

# Sinfoni — Skill projet

## Qu'est-ce que Sinfoni ?

Application web **React + TypeScript + Supabase** pour un syndicat d'énergie (marque **GSI Concept**) et un **portail commune** (élus). Gère chantiers/affaires (électricité, éclairage public, télécom, IRVE), GED, cartographie, chiffrage BPU, PDF devis/factures, suivi MO, photos terrain, analytics et PPI.

**Stack** : Vite 5 (port **4301**), React 18, Tailwind, React Router 7, TanStack Query, Leaflet, jspdf, shpjs/shp-write.

**Langue UI** : français. Répondre en français.

Pour l'inventaire détaillé (fichiers, migrations, transcripts), voir [reference.md](reference.md).

---

## Architecture — règles non négociables

1. **Client Supabase** → toujours les vues `public.*`, jamais `app.*` directement.
2. **Multi-tenant** : filtrer par `organization_id` dans chaque hook/mutation.
3. **Commune** : filtrer aussi par `commune_insee_code` (hook + RLS JWT).
4. **Hooks données** : `useQuery`/`useMutation` + invalidation (`['projects']`, `['energy-assets']`, etc.).
5. **Providers** : `AuthProvider` → `RoleProvider` → routes dans `App.tsx`.
6. **Dev** : `RoleSwitcher` peut override le profil Auth pour tester les rôles sans JWT.

### Structure `src/`

| Dossier | Rôle |
|---------|------|
| `views/` | Pages (routes) |
| `components/` | UI réutilisable |
| `hooks/` | Auth, rôles, données Supabase |
| `lib/` | Supabase, constantes, SIG, calculateurs |
| `utils/` | `alertEngine`, `pdfGenerator` |
| `types/` | Domaine + `database.ts` |

---

## Rôles et permissions

| Rôle | Accès |
|------|-------|
| `DGS`, `DST` | Syndicat complet + analytics/PPI/utilisateurs |
| `Chargé d'Affaires` | Affaires, carte, GED, SIG import/export |
| `Prestataire Extérieur` | Dashboard + GED |
| `COMMUNE` | `/commune/*` uniquement (lecture patrimoine, demandes travaux) |

**API rôle** : `useRole()` → `canAccess(roles)`, `isCommune`, `communeInseeCode`.

**Commune démo** : Claire Martin, INSEE `13004` (Arles).

**SIG** : import/export réservés à DGS, DST, Chargé d'Affaires — **pas** COMMUNE.

---

## Modules fonctionnels

### Affaires / Projects

- **Types** : Électricité, Éclairage Public, Télécom, IRVE
- **Statuts** : Brouillon → En Étude → Proposé → Validé → APS/APD → BC/OS → En cours → PV/Réception → Clôturé → À planifier
- **Fiche** (`ProjectDetail.tsx`) : 4 onglets syndicat ; vue simplifiée commune via `CommuneProjectDetail`
- **Workflow instruction** : syndicat envoie offre (→ Proposé) ; commune accepte (→ Validé) ou révision (→ En Étude) — `ProjectInstructionActions`
- **Alertes carte** (`alertEngine.ts`) : budget > 90 %, retard planning, facturation bloquée
- **Géo** : `latitude`/`longitude` + fallback hash (`lib/geo.ts`)

### Financier & BPU

- Devis HT, facturation, acompte 30 % / solde 70 %, TVA 20 %
- `bpu_catalog` + `project_quote_lines` ; trigger sync `quote_amount_ht`
- `ProjectQuoteLinesSection`, `useProjectQuoteLines`, `useBpuCatalog`
- PDF devis/facture : `utils/pdfGenerator.ts` (jspdf)

### GED & Documents

- Bucket Storage `documents` ; upload via `useDocuments`
- Catégories : Administratif, Technique, Financier

### Carte & SIG

**Carte syndicat** (`Carte.tsx`) :
- Chantiers + filtres alertes/entreprise/statut + mode proximité 25 km
- Couche énergie (IRVE + éclairage) : `EnergyAssetsMapLayer`
- **Import** : `SigImportZone` + `useImportEnergyAssets`
- **Export** : `SigExportButton` + `lib/sigExporter.ts`

**Carte commune** (`CommuneCarte.tsx`) :
- Consultation + placement demandes travaux (`CommuneDemandForm`, `useCreateCommuneDemand`)
- Pas d'import SIG

**Patrimoine** (`energy_assets`) :
- Types : `irve` | `eclairage` ; statuts : `functional` | `maintenance` | `broken`
- Métadonnées JSON : `power_kw`, `total_power_w`, `connector_type`, etc.

**Import SIG** (`lib/sigParser.ts`) :
- Formats : `.zip` (Shapefile), `.geojson`
- Infère type depuis attributs ; INSEE **choisi manuellement** dans l'UI (`departmentCommunes.ts`), jamais lu du fichier

**Export SIG** (`lib/sigExporter.ts`) :
- Coords **[longitude, latitude]** pour shp-write
- Propriétés : `id`, `nom`, `type`, `puissance`, `etat`, `insee` — compatibles réimport

### LED & CEE

- `LedRoiSimulator` + `ledRoiCalculator.ts` — affiché si projet Éclairage Public
- Plan financement CEE BAR-EQ-111 + subvention syndicat 30 %

### Autres vues

| Route | Vue |
|-------|-----|
| `/` | Dashboard widgets |
| `/ged` | GED centralisée |
| `/signatures` | Signatures électroniques |
| `/rapports` | Rapports sauvegardés |
| `/analytics` | CA, marge, santé portefeuille |
| `/ppi` | Planification PPI (plafond 2 M€) |
| `/utilisateurs` | CRUD utilisateurs |
| `/integrations` | Connecteurs (UI démo) |
| `/conformite` | RGPD, audit |
| `/commune/dossiers` | Dossiers commune |

---

## Migrations Supabase — pattern

Ordre dans `supabase/migrations/` (préfixe `20260703`–`20260704`).

**Pattern obligatoire** :
1. `CREATE TABLE app.*`
2. Triggers / RLS si nécessaire
3. `CREATE VIEW public.* AS SELECT ... FROM app.*`
4. `NOTIFY pgrst, 'reload schema'`

**RLS active** : `projects`, `users`, `energy_assets` (isolation org + filtre commune JWT).

**Org dev** : `00000000-0000-0000-0000-000000000001`.

**Buckets Storage** (à créer si absents) : `documents`, `project-photos`.

**Attention** : `ppi_year` utilisé en front mais migration manquante — ajouter si besoin PPI.

---

## Workflows de développement

### Ajouter une feature métier

1. Lire les conventions dans les fichiers voisins (hooks, views, lib).
2. Migration SQL si nouvelle table/colonne → vue `public.*`.
3. Types dans `types/index.ts` + `types/database.ts` si nécessaire.
4. Hook React Query dans `hooks/`.
5. Composant/vue + filtre rôle via `useRole().canAccess`.
6. `npm run typecheck` puis `npm run build`.

### Modifier le SIG

- Import : `sigParser.ts` → `ParsedSigFeature` → `useImportEnergyAssets`
- Export : `EnergyAsset` → `sigExporter.ts` → shp-write ZIP
- Garder la **boucle réimport** : propriétés `type`, `nom`, `puissance` reconnues par `inferAssetType`

### Tester les rôles

1. `npm run dev` (port 4301)
2. `RoleSwitcher` dans le header pour basculer DGS / Commune / etc.
3. Commune → redirection auto vers `/commune/carte` (`Layout.tsx`)

---

## Constantes clés (`lib/projectConstants.ts`)

- `VAT_RATE` = 0.2
- `LABOR_HOURLY_RATE` = 45 €
- `PPI_CEILING_EUR` = 2 000 000
- `MAP_CENTER` = [43.7, 4.0]
- `DEMO_COMMUNE_INSEE` = `13004`

---

## Historique des sessions (4 juil. 2026)

Chronologie du développement récent :

1. PDF devis/factures (`pdfGenerator.ts`)
2. BPU & chiffrage (`bpu_catalog`, `project_quote_lines`, trigger sync)
3. Galerie photos terrain (`project_photos`, bucket Storage)
4. Portail Communes (rôle COMMUNE, RLS, `CommuneCarte`, demandes travaux)
5. Patrimoine énergétique (`energy_assets`, couche carte, marqueurs)
6. Simulateur LED + plan financement CEE
7. Workflow instruction (En Étude / Proposé / Validé)
8. Import SIG (`sigParser`, `SigImportZone`, shpjs)
9. Sécurisation SIG (import retiré de CommuneCarte, sélecteur communes BD-Rhône)
10. Export SIG (`sigExporter`, `SigExportButton`, shp-write)

---

## Checklist avant PR / livraison

- [ ] Types stricts, pas de `any` inutile
- [ ] Filtrage `organization_id` (+ INSEE si commune)
- [ ] Permissions rôle vérifiées côté UI
- [ ] Migration + vue `public.*` si schéma modifié
- [ ] Textes UI en français
- [ ] `npm run typecheck` + `npm run build` OK
- [ ] Pas de commit sauf demande explicite de l'utilisateur

---

## Ressources

- Inventaire complet : [reference.md](reference.md)
- Mock data dev : `src/data/mockData.ts`
- Env vars : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEFAULT_ORGANIZATION_ID`
