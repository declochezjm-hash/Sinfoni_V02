# Directeur des Services Techniques (DST)

Fiche métier SINFONI — exploitation des réseaux, patrimoine énergétique, planification des entreprises et réception des ouvrages.

| Attribut | Valeur |
|----------|--------|
| **Rôle applicatif** | `DST` |
| **Périmètre** | Identique DGS côté droits : syndicat complet + analytics / PPI / utilisateurs |
| **Focus métier** | Technique, maintenance, planning, SIG, PV de réception |
| **Isolation données** | `organization_id` |
| **Compte démo** | `p.durand@syndicat.fr` |

---

## 1. Mission

Le DST est responsable de **la continuité de service** (éclairage public, IRVE, photovoltaïque, interfaces Enedis) et de **la qualité d’exécution** des marchés (entreprises mandataires, DICT, arrêtés, réceptions).

Dans SINFONI, il s’appuie sur :

- le **patrimoine** `energy_assets` (IRVE / éclairage, statuts `functional` | `maintenance` | `broken`) ;
- les **tickets** `tickets_maintenance` (priorités `low` → `critical`) ;
- le **planning** (créneaux, charge, habilitations électriques) ;
- la **carte SIG** (import/export Shapefile, couche énergie, chantiers) ;
- la **fiche affaire** jusqu’au jalon **PV/Réception**.

---

## 2. Exploitation & maintenance

### 2.1 Taux de résolution des pannes d’éclairage public

Parcours :

1. `/maintenance` — filtres statut (`open`, `in_progress`, `resolved`, `closed`) et priorité.
2. Croiser avec la carte : marqueurs éclairage `broken` (pulse) vs `maintenance`.
3. Fiche ticket : équipement lié, chantier optionnel, assignation prestataire ou contact (`ContactAssignSelect`).
4. Clôture : statut `resolved` / `closed` + fiche d’intervention PDF (`interventionSheetPdf`).

**Indicateur DST** :

| Métrique | Calcul métier | Source SINFONI |
|----------|---------------|----------------|
| Taux de résolution | Tickets EP `resolved`+`closed` / tickets ouverts sur la période | `/maintenance` + Richard `getPPIMaintenanceOverview` |
| Délai moyen critique | `scheduled_end` − création, priorité `critical` | Planning + tickets |
| Stock de pannes | Assets `broken` sur la commune / le territoire | Couche `EnergyAssetsMapLayer` |

### 2.2 Pannes critiques

Priorité `critical` : le DST exige une **assignation nominative** (contact avec habilitations électriques) et un **créneau** `scheduled_start` / `scheduled_end`. Sans habilitation adéquate, le planning doit le signaler (module habilitations).

Circuit :

```
Ticket critical → assignation contact/prestataire
→ créneau planning → intervention → photos GED / galerie affaire
→ résolution → éventuellement OS de remplacement sur affaire liée
```

### 2.3 Patrimoine : IRVE, photovoltaïque, réseau Enedis

| Famille | Dans SINFONI aujourd’hui | Usage DST |
|---------|--------------------------|-----------|
| **IRVE** | `energy_assets.type = irve` ; metadata `power_kw`, `connector_type` | Inventaire bornes, pannes, import SIG |
| **Éclairage public** | `type = eclairage` ; `total_power_w` ; simulateur LED / CEE BAR-EQ-111 | Vétusté, passage LED, tickets |
| **Photovoltaïque** | Pas de type asset dédié : suivi via **affaires** (type à rapprocher Électricité / IRVE selon le marché) et GED technique | Dossiers de raccordement, PVR |
| **Réseau Enedis** | Pas de jumeau réseau : affaire type **Électricité**, documents GED (DICT, P1/P2, ATU), carte chantiers | Coordination concessionnaire |

**Import SIG** (`SigImportZone`) : ZIP Shapefile ou GeoJSON. L’INSEE est **choisi dans l’UI** (`departmentCommunes`), jamais lu dans le fichier. **Export** (`SigExportButton`) : propriétés `id`, `nom`, `type`, `puissance`, `etat`, `insee` — boucle réimport.

Le DST valide la **qualité de la donnée patrimoniale** (statut, puissance, géolocalisation) : un import massif sans contrôle pollue le taux de pannes.

---

## 3. Planification

### 3.1 Taux de charge des entreprises mandataires

Module `/planning` + `/contacts` :

- Timeline (`PlanningTimeline`) : jour / semaine / mois.
- `TeamWorkloadPanel` / `useContactsWorkload` : charge des interlocuteurs.
- Assignation technicien (`TechnicianAssignSelect`) vs prestataire extérieur.

Le DST arbitre la **surcharge** : reporter un ticket `medium`, protéger les `critical`, éviter le chevauchement d’OS sur le même mandataire.

Chantiers (`app.chantiers`) : code, budget, lat/lng, liés aux tickets et au PPI — ex. démo **CH-2026-005** ↔ affaire **AF-2026-VOIRIE-005**.

### 3.2 Arrêtés de circulation et contrôles DICT

SINFONI ne calcule pas l’arrêté : il **porte les pièces** et le **jalon**.

| Pièce | Catégorie GED | Moment du workflow |
|-------|---------------|-------------------|
| DICT / DT-DICT | Technique | Avant `En cours` / ouverture de tranchée |
| Arrêté de circulation | Administratif | Avant intervention voirie |
| ATU / autorisation Enedis | Technique | Affaires Électricité |
| PV de réception (PVR) | Technique + Administratif | Statut `PV/Réception` |
| Levée de réserves | Technique | Avant `Clôturé` |

Le DST **refuse le passage** `En cours` → `PV/Réception` si DICT ou arrêté manquent dans la GED contextuelle de l’affaire.

---

## 4. Cas d’usage SINFONI

### 4.1 Valider les PV de réception (PVR) et levées de réserves

1. Affaire en `En cours` : vérifier photos terrain (galerie avant/après, bucket `project-photos`) et métrés GED.
2. Passage statut **`PV/Réception`**.
3. GED : téléverser PVR signé (catégorie Technique) ; circuit `/signatures` si signature électronique.
4. Réserves : ticket maintenance lié à l’asset ou au chantier, priorité `high` / `critical`.
5. Levée : document GED + clôture ticket → statut affaire **`Clôturé`**.
6. Finances / Chargé d’Affaires : déblocage du **solde 70 %** (`invoice_balance`).

### 4.2 Synchronisation cartographique SIG

1. `/carte` — couche chantiers + couche énergie.
2. Création clic (`MapEnergyAssetCreationClickHandler`) ou import ZIP.
3. Repositionnement drag si le GPS terrain corrige le SIG.
4. Export Shapefile pour le prestataire SIG / la commune (hors rôle COMMUNE : l’élu consulte, n’importe pas).
5. Table attributaire (`AttributeTableDrawer`) : contrôle qualité avant Bureau.

### 4.3 Croiser PPI et maintenance

Richard : outil **`getPPIMaintenanceOverview`** — vision unique investissement vs pannes. Utile pour argumenter un programme LED (CEE BAR-EQ-111, subvention syndicat 30 %) sur un réseau vétuste.

---

## 5. Modules, données et droits

| Module | Route | Usage DST |
|--------|-------|-----------|
| Maintenance | `/maintenance` | Tickets, drawer détail, PDF intervention |
| Planning | `/planning` | Charge, habilitations, créneaux |
| Carte | `/carte` | SIG, patrimoine, alertes, proximité 25 km |
| Affaires | `/affaires/:id` | Onglet Technique, carte affaire, CEE si EP |
| GED | `/ged` | DICT, PVR, arrêtés |
| Contacts | `/contacts` | Organigramme, habilitations `electrical_habilitations[]` |
| Analytics / PPI | `/analytics`, `/ppi` | Arbitrage technique vs enveloppe |

**SGBD** : `energy_assets`, `tickets_maintenance`, `contacts`, `chantiers`, `projects`, `documents`, `project_photos`, `ppi_planification`. RLS tickets : org + fallback rôle.

**BPU** : le DST ne recote pas ; il **conteste** une ligne aberrante (quantité terrain vs bordereau) auprès du Chargé d’Affaires avant OS.

**Workflow** : le DST est le **validateur technique** des jalons `APS/APD` → `BC/OS` → `En cours` → `PV/Réception`.

---

## 6. Propositions & automatisations

| Automatisation | Déclencheur | Action | Bénéfice |
|----------------|-------------|--------|----------|
| **Analyse prédictive des pannes** | Historique tickets sur assets `eclairage` d’un même secteur / âge estimé (puissance élevée, statut souvent `maintenance`) | Score « réseau vétuste » sur la carte + suggestion d’affaire LED | Passe d’une maintenance curative à un **PPI ciblé** |
| Escalade critique | Ticket `critical` non assigné > 2 h | Push DST + prestataire astreinte | Continuité EP / IRVE |
| DICT manquante | Passage demandé vers `En cours` sans document Technique « DICT » | Blocage workflow + notif Chargé d’Affaires | Conformité voirie |
| Charge mandataire | Taux de charge contact > seuil (panel workload) | Alerte planning, proposition de report | Évite la sous-traitance en catastrophe |
| Sync SIG | Asset `broken` sans ticket ouvert | Création automatique de ticket | Zéro panne « orpheline » |

---

## 7. Interactions avec les autres profils

| Profil | Interaction |
|--------|-------------|
| DGS | Fournit le taux de résolution et les risques chantier pour le Bureau |
| Chargé d’Affaires | Valide le fond technique du BPU et les PVR ; reçoit les OS |
| Prestataire | Exécute les tickets, alimente la GED et les photos |
| Finances | PVR signé = brique du rapprochement attachement / facture |
| Élu | Délais d’intervention visibles sur le portail (transparence) |

---

## 8. Questions à poser à Richard

- *« Urgences maintenance »*
- *« Planning de la journée »*
- *« Quelles sont les responsabilités du DST sur les PVR dans SINFONI ? »*
- *« Vue PPI et maintenance »* (`getPPIMaintenanceOverview`)
- *« Où trouver l’import Shapefile ? »* → `/carte` (SIG)

**Posture attendue de Richard** : statut, planning, maintenance, arbitrage — faits uniquement.
