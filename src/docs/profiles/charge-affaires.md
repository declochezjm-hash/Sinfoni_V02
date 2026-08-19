# Chargé d’Affaires / Ingénieur Travaux

Fiche métier SINFONI — cycle de vie complet de l’affaire, chiffrage BPU, GED contextuelle et suivi de chantier.

| Attribut | Valeur |
|----------|--------|
| **Rôle applicatif** | `Chargé d'Affaires` |
| **Périmètre** | Affaires, carte, GED, SIG import/export, planning, contacts, signatures, rapports |
| **Hors périmètre** | Analytics, PPI dashboard, utilisateurs, intégrations, conformité (DGS/DST) |
| **Isolation données** | `organization_id` |
| **Compte démo** | `s.bernard@syndicat.fr` |

---

## 1. Mission

Le Chargé d’Affaires (CA) est le **pilote opérationnel du dossier**. Il transforme une demande (interne, prestataire ou **commune**) en ouvrage réceptionné et facturable.

Il est le seul profil syndicat « de terrain » à enchaîner **au quotidien** : étude → BPU → OS → attachements → GED → clôture DGD.

---

## 2. Cycle de vie de l’affaire

### 2.1 Chaîne complète

```
Étude d’opportunité
  → Chiffrage BPU (bpu_catalog + project_quote_lines)
  → Offre (statut Proposé) / acceptation commune (Validé)
  → APS/APD
  → Émission de l’Ordre de Service (statut BC/OS)
  → Exécution (En cours) + attachements + photos / métrés GED
  → PV/Réception
  → Clôture DGD (Clôturé) + solde 70 %
```

| Étape métier | Statut SINFONI | Actions CA | Données |
|--------------|----------------|------------|---------|
| Opportunité / instruction | `Brouillon`, `En Étude` | Créer l’affaire (`/affaires`), localiser (lat/lng, carte affaire), lier INSEE | `projects` |
| Chiffrage | `En Étude` | Lignes BPU, PDF devis HT | `bpu_catalog`, `project_quote_lines`, trigger `quote_amount_ht` |
| Offre | `Proposé` | `ProjectInstructionActions` : envoyer l’offre | `quote_status = Envoyé au client` |
| Accord | `Validé` | Commune accepte (portail) ; budget total = devis HT | `quote_status = Accepté` |
| Études | `À planifier`, `APS/APD` | PPI année (`ppi_year`) si DGS l’a ouvert ; DICT, arrêtés | GED Technique / Administratif |
| OS | `BC/OS` | Bon de commande / OS, signatures | `billing_status` encore `À émettre` |
| Travaux | `En cours` | Attachements, photos certifiées, suivi MO, tickets | `project_photos`, `project_timesheets`, tickets |
| Réception | `PV/Réception` | PVR, réserves | GED + DST |
| DGD / clôture | `Clôturé` | DGD, solde, CEE si EP | Facture solde 70 %, `Payé` |

**Demande commune** : l’élu pose un point sur `/commune/carte?mode=demande` → `useCreateCommuneDemand` crée un projet `source_demand = 'commune'` déjà tagué INSEE. Le CA reprend en `En Étude`.

Types d’affaire : **Électricité**, **Éclairage Public**, **Télécom**, **IRVE**.

### 2.2 Bordereau des Prix Unitaires (BPU)

Le BPU est le **cœur du chiffrage** :

1. Catalogue `bpu_catalog` (prix unitaires syndicat).
2. Saisie des lignes dans `ProjectQuoteLinesSection` (quantités terrain / métrés).
3. Trigger SQL : synchronise `projects.quote_amount_ht`.
4. TVA **20 %** (`VAT_RATE`) ; PDF devis HT / facture TTC (`pdfGenerator`).
5. Acceptation devis → `budget_total` = montant HT.

Le CA est **responsable de la cohérence quantité × prix**. Finances détectera plus tard l’écart facture vs BPU (fiche Finances) : un métré bâclé ici crée un rejet Chorus demain.

Acompte **30 %** / solde **70 %** : le CA déclenche l’émission avec Finances après jalons OS (acompte) et PVR (solde).

MO optionnelle : `enable_time_tracking` + `project_timesheets` (taux horaire **45 €** HT). Incluse dans l’alerte budget > 90 % si le suivi temps est actif.

### 2.3 Ordre de Service, attachements, DGD

| Document | Catégorie GED | Statut cible |
|----------|---------------|--------------|
| Devis / offre | Financier | `Proposé` |
| OS / BC | Administratif + Financier | `BC/OS` |
| DICT, plan d’exécution | Technique | avant `En cours` |
| Attachement / situation de travaux | Financier | `En cours` |
| Photos métrés | Galerie + GED Technique | `En cours` |
| PVR / levée de réserves | Technique | `PV/Réception` |
| DGD | Financier | `Clôturé` |

---

## 3. Suivi terrain

### 3.1 Photos certifiées et métrés (GED contextuelle)

- **Galerie affaire** (`ProjectPhotoGallerySection`) : tags **avant / après**, bucket Storage `project-photos`.
- **GED** (`useDocuments`) : bucket `documents`, catégories Administratif / Technique / Financier.
- Upload depuis la fiche (onglet Documents) **ou** la GED centralisée `/ged`.
- Génération de pièces types : `GenerateDocumentModal` + `administrativeDocumentGenerator` (PDF client).

La GED est **contextuelle** : chaque pièce reste rattachée à l’affaire (`project_id`). Le CA ne dépose pas « en vrac » sans dossier.

### 3.2 DICT et coordination

Avant ouverture de tranchée : pièce DICT dans GED Technique. Le DST peut bloquer le jalon (voir fiche DST). Le CA **anticipe** : checklist Workflow (onglet Workflow + `workflow_steps` + `activity_logs`).

Carte `/carte` : poser / corriger l’ouvrage, mode proximité 25 km pour enchaîner les visites, import SIG si le patrimoine doit être créé avec le chantier IRVE/EP.

---

## 4. Cas d’usage SINFONI

### 4.1 Synthétiser les pièces manquantes en 1 clic (Richard)

Commandes utiles :

- *« Quelles pièces manquent sur AF-2026-VOIRIE-005 ? »* → Richard appelle **`getAffaireDetails`** (Affaires + GED) et liste les trous (devis, OS, DICT, PVR).
- Relance type du prompt CA : *« Voir le détail GED ? »*

Le CA colle ensuite les actions : téléverser, relancer le prestataire, ou générer un document administratif.

### 4.2 Instruction commune

1. Offre envoyée → `Proposé`.
2. L’élu accepte → `Validé` (ou révision → `En Étude`).
3. Le CA ne « force » pas le Validé : le workflow d’approbation est **partagé** avec le portail commune.

### 4.3 Affaire éclairage public + CEE

Onglet **CEE** : `LedRoiSimulator` + `EnergyCEEDashboard` (BAR-EQ-111, subvention syndicat 30 %). Le CA joint le plan de financement à l’offre pour l’élu (facture énergétique, passage LED).

---

## 5. Modules, données et droits

| Module | Route | Usage CA |
|--------|-------|----------|
| Affaires | `/affaires` | CRUD, filtres type/statut |
| Fiche | `/affaires/:id` | 5 onglets, BPU, photos, MO, instruction, CEE |
| GED | `/ged` | Toutes catégories, génération PDF |
| Carte / SIG | `/carte` | Import/export, patrimoine, chantiers |
| Planning | `/planning` | Jalons intervention liés aux tickets |
| Contacts | `/contacts` | Entreprises, habilitations |
| Signatures | `/signatures` | OS, PVR |
| Rapports | `/rapports` | Canevas récurrents |

**Restriction SIG** : import/export **autorisés** (contrairement à COMMUNE).

**SGBD** : `projects`, `project_quote_lines`, `bpu_catalog`, `documents`, `project_photos`, `workflow_steps`, `activity_logs`, `energy_assets`, `chantiers`. Prototypage : RLS partielle sur documents / BPU / timesheets.

---

## 6. Propositions & automatisations

| Automatisation | Déclencheur | Action | Bénéfice |
|----------------|-------------|--------|----------|
| **Retard planning → notif prestataire** | `expected_end_date` dépassée et statut ∉ {`Clôturé`, `PV/Réception`} (déjà alerte `retard`) | Notification + e-mail à `contractor_id` / contact mandataire | Le CA n’est plus relanceur manuel |
| Checklist GED | Changement de statut (ex. vers `BC/OS`) | Liste des pièces obligatoires manquantes (OS, DICT, devis accepté) poussée par Richard | Dossier « 1 clic » |
| Écart métré | Quantité ligne BPU vs attachement saisi | Alerte CA + Finances | Anticiper le rejet de facture |
| Relance commune | `Proposé` > N jours | Rappel portail | Débloque l’instruction |
| Photo sans GPS / sans tag | Upload galerie incomplet | Demande de re-téléversement | Preuve opposable |

---

## 7. Interactions avec les autres profils

| Profil | Ce que le CA livre | Ce qu’il attend |
|--------|--------------------|-----------------|
| DGS | Avancement, RAR affaire, alertes 80/90 % | Arbitrage enveloppe |
| DST | Dossier technique, PVR, SIG à jour | Validation PVR / DICT |
| Finances | BPU, OS, attachements, DGD | Rapprochement, RAC, appels de fonds |
| Prestataire | OS, plans, tickets | Photos, métrés, respect planning |
| Élu | Offre lisible, délais | Acceptation / révision |

---

## 8. Questions à poser à Richard

- *« Affaires type électricité »*
- *« Statut de AF-2026-VOIRIE-005 »* (`getAffaireDetails`)
- *« Quelles sont les responsabilités du Chargé d’Affaires sur le BPU dans SINFONI ? »*
- *« Pièces manquantes de ce dossier »*
- *« Planning de la journée »*

**Posture attendue de Richard** : statut affaire, prochain jalon, pièces manquantes.
