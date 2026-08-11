# Sinfoni — Référence détaillée

Document complémentaire au [SKILL.md](SKILL.md). À lire uniquement quand le détail fichier par fichier est nécessaire.

---

## Routes (`src/App.tsx`)

| Route | Fichier | Rôles sidebar |
|-------|---------|---------------|
| `/` | `views/Dashboard.tsx` | DGS, DST, Chargé d'Affaires, Prestataire |
| `/affaires` | `views/Affaires.tsx` | DGS, DST, Chargé d'Affaires |
| `/affaires/:id` | `views/ProjectDetail.tsx` | Syndicat ou Commune (vue adaptée) |
| `/ged` | `views/GED.tsx` | + Prestataire |
| `/signatures` | `views/Signatures.tsx` | DGS, DST, Chargé d'Affaires |
| `/carte` | `views/Carte.tsx` | DGS, DST, Chargé d'Affaires |
| `/rapports` | `views/Rapports.tsx` | DGS, DST, Chargé d'Affaires |
| `/analytics` | `views/Analytics.tsx` | DGS, DST |
| `/ppi` | `views/PpiDashboard.tsx` | DGS, DST |
| `/utilisateurs` | `views/Utilisateurs.tsx` | DGS, DST |
| `/integrations` | `views/Integrations.tsx` | DGS, DST |
| `/conformite` | `views/Conformite.tsx` | DGS, DST |
| `/commune/carte` | `views/CommuneCarte.tsx` | COMMUNE |
| `/commune/dossiers` | `views/CommuneDossiers.tsx` | COMMUNE |
| `/commune/dossiers/:id` | `views/ProjectDetail.tsx` | COMMUNE |

---

## Hooks (`src/hooks/`)

| Hook | Fichier | Rôle |
|------|---------|------|
| Auth | `useAuth.tsx` | Session Supabase, profil, `organizationId` |
| Rôles | `useRole.tsx` | Permissions, commune INSEE, switchRole |
| Projets | `useProjects.ts` | CRUD, workflow, logs, `useCreateCommuneDemand` |
| Détail projet | `useProject` (dans useProjects) | Lecture + update |
| Documents | `useDocuments.ts` | GED + Storage |
| BPU | `useBpuCatalog.ts` | Catalogue prix |
| Devis | `useProjectQuoteLines.ts` | Lignes devis |
| Temps | `useProjectTimesheets.ts` | Feuilles de temps |
| Photos | `useProjectPhotos.ts` | Galerie terrain |
| Énergie | `useEnergyAssets.ts` | Patrimoine IRVE/éclairage |
| Import SIG | `useImportEnergyAssets.ts` | Bulk insert energy_assets |
| Notifications | `useNotifications.ts` | Dashboard |
| Alertes | `useProjectAlerts.ts` | Header |

---

## Composants métier (`src/components/`)

| Composant | Domaine |
|-----------|---------|
| `Layout.tsx` | Shell + redirect commune |
| `Sidebar.tsx` | Nav filtrée par rôle |
| `Header.tsx` | Recherche, alertes, RoleSwitcher |
| `ProjectMapEditor.tsx` | Géoloc chantier Leaflet |
| `BudgetProgressBar.tsx` | Barre budget |
| `TimeProgressBar.tsx` | Barre planning |
| `FinancialStatusBadges.tsx` | Badges devis/facturation |
| `ProjectQuoteLinesSection.tsx` | Chiffrage BPU |
| `ProjectTimesheetSection.tsx` | Suivi MO |
| `ProjectPhotoGallerySection.tsx` | Photos avant/après |
| `LedRoiSimulator.tsx` | ROI LED + CEE |
| `ProjectInstructionActions.tsx` | Workflow instruction commune |
| `CommuneDemandForm.tsx` | Nouvelle demande travaux |
| `CommuneProjectDetail.tsx` | Fiche projet élu |
| `EnergyAssetsMapLayer.tsx` | Couche carte patrimoine |
| `SigImportZone.tsx` | Import Shapefile/GeoJSON |
| `SigExportButton.tsx` | Export Shapefile |
| `MetricCard.tsx`, `BudgetChart.tsx`, etc. | Dashboard |

---

## Lib métier (`src/lib/`)

| Fichier | Rôle |
|---------|------|
| `supabase.ts` | Client Supabase |
| `authService.ts` | Profil user par email |
| `organization.ts` | Résolution org dev |
| `projectConstants.ts` | Constantes métier |
| `utils.ts` | Formatage, couleurs statuts |
| `geo.ts` | Hash → coordonnées fallback |
| `mapFilters.ts` | Filtres carte chantiers |
| `mapMarkers.ts` | Icônes alertes |
| `energyAssetMarkers.ts` | Icônes IRVE/éclairage |
| `ledRoiCalculator.ts` | Calcul ROI LED |
| `sigParser.ts` | Import SIG |
| `sigExporter.ts` | Export SIG |
| `departmentCommunes.ts` | Liste communes BD-Rhône (import) |

---

## Types principaux (`src/types/index.ts`)

```typescript
UserRole = 'DGS' | 'DST' | "Chargé d'Affaires" | 'Prestataire Extérieur' | 'COMMUNE'
ProjectType = 'Électricité' | 'Éclairage Public' | 'Télécom' | 'IRVE'
ProjectStatus = 'Brouillon' | 'En Étude' | 'Proposé' | 'Validé' | ...
EnergyAssetType = 'irve' | 'eclairage'
EnergyAssetStatus = 'functional' | 'maintenance' | 'broken'
CommuneWorkRequestType = 'Éclairage Public' | 'Extension BT' | ...
SourceDemand = 'commune' | 'interne' | 'prestataire'
```

---

## Migrations (`supabase/migrations/`)

| Fichier | Contenu |
|---------|---------|
| `20260703000000_init_sinfoni.sql` | Schémas admin/app, tables init, vues public, users démo |
| `20260703120000_documents_storage.sql` | Colonnes file_url, mime_type |
| `20260703160000_affaires_geo_status.sql` | latitude, longitude, statut À planifier |
| `20260703170000_refresh_projects_view.sql` | Refresh vue projects |
| `20260704120000_project_financial.sql` | quote_status, billing, acompte/solde |
| `20260704130000_project_planning_dates.sql` | Dates planning |
| `20260704140000_project_time_tracking.sql` | project_timesheets |
| `20260704150000_bpu_catalog_quote_lines.sql` | BPU + lignes devis + trigger |
| `20260704160000_project_photos.sql` | project_photos |
| `20260704170000_commune_portal.sql` | COMMUNE, RLS projects/users |
| `20260704180000_energy_assets.sql` | Patrimoine IRVE/éclairage + RLS |
| `20260704190000_project_instruction_statuses.sql` | En Étude, Proposé, Validé |

### Tables `app.*`

`projects`, `workflow_steps`, `documents`, `activity_logs`, `notifications`, `signatures`, `field_photos`, `saved_reports`, `dashboard_widgets`, `users`, `project_timesheets`, `bpu_catalog`, `project_quote_lines`, `project_photos`, `energy_assets`

### RLS

- `projects` : `projects_org_and_commune`
- `users` : `users_self_or_staff`
- `energy_assets` : `energy_assets_org_and_commune`

Helpers JWT : `app.current_user_role()`, `app.current_user_commune_insee_code()`, `app.is_commune_user()`

---

## SIG — détail technique

### Import (`sigParser.ts`)

1. Parse `.geojson` ou `.zip` (shpjs)
2. Extrait Point/MultiPoint, corrige ordre lat/lng
3. `inferAssetType(props)` : mots-clés irve/borne/eclairage + heuristique puissance
4. `buildMetadata(props, type)` : power_kw ou total_power_w
5. Retourne `ParsedSigFeature[]`

### Export (`sigExporter.ts`)

1. `EnergyAsset` → Feature GeoJSON Point `[lng, lat]`
2. Propriétés : id, nom, type, puissance, etat, insee
3. `download()` shp-write → ZIP `{folder}/points_{type}.shp`

### Sécurité

- Import/export UI : `SigImportZone`, `SigExportButton` — rôles syndicat uniquement
- `useImportEnergyAssets` : rejette COMMUNE ; INSEE imposé par sélecteur UI
- CommuneCarte : couche énergie lecture seule, pas d'import

---

## Scripts npm

```bash
npm run dev        # Vite port 4301
npm run build      # Production
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint 9
npm run preview    # Preview port 4301
```

---

## Sessions Cursor (4 juil. 2026)

| # | Sujet | Fichiers clés |
|---|-------|---------------|
| 1 | PDF devis/factures | `utils/pdfGenerator.ts`, ProjectDetail |
| 2 | BPU & chiffrage | migration 041500, `ProjectQuoteLinesSection` |
| 3 | Galerie photos | migration 041600, `useProjectPhotos` |
| 4 | Portail Communes | migration 041700, `CommuneCarte`, RLS |
| 5 | IRVE & LED | migration 041800, `EnergyAssetsMapLayer`, `LedRoiSimulator` |
| 6 | CEE & instruction | migration 041900, `ProjectInstructionActions` |
| 7 | Import SIG | `sigParser`, `SigImportZone`, shpjs |
| 8 | Sécurité SIG | retrait CommuneCarte, `departmentCommunes` |
| 9 | Export SIG | `sigExporter`, `SigExportButton`, shp-write |

---

## Pièges connus

1. **shp-write** : module `assert` externalisé par Vite — build OK avec warning
2. **shp-write deprecated** : package `@mapbox/shp-write` existe mais projet utilise `shp-write@0.3.2`
3. **RLS partielle** : documents, timesheets, BPU sans RLS (prototypage)
4. **Integrations** : UI démo sans backend réel
5. **Mock users** : `RoleSwitcher` peut masquer le profil Auth réel en dev
