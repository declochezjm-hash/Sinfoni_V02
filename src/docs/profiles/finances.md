# Responsable Finances & Comptabilité

Fiche métier SINFONI — chaîne de dépense, financements croisés, RAC communal et contrôle BPU / facture.

| Attribut | Valeur |
|----------|--------|
| **Rôle applicatif** | Pas de rôle dédié : exercice via profils **DGS** ou **DST** (analytics, PPI, GED Financier) |
| **Périmètre cible** | Devis, facturation acompte/solde, PPI, GED Financier, Richard `getBudgetSummary` |
| **Isolation données** | `organization_id` ; ventilation analytique par `commune_insee_code` |
| **Outil IA clé** | `getBudgetSummary` (commune, filière, exercice) |

---

## 1. Mission

Le responsable Finances assure que **chaque euro engagé** est :

1. **Rattaché** à une affaire, une commune (INSEE) et une filière (Électricité, Éclairage Public, Télécom, IRVE) ;
2. **Justifié** par un triptyque pièce (BC/OS, attachement, facture) ;
3. **Financé** (FDE, Fonds Vert, Région, CEE, reste à charge commune) ;
4. **Payé** dans Chorus (ou circuit PDF) sans écart vs BPU.

SINFONI n’est pas un ERP comptable Hélios/Chorus : c’est le **pré-mandat** et le **contrôle d’opportunité**. L’écriture de mandat reste dans le logiciel financier ; SINFONI fournit le **dossier de paiement** et les **bilans consolidés**.

---

## 2. Chaîne complète de dépense

### 2.1 Rapprochement tripartite

| Maillon | Objet | Dans SINFONI | Contrôle Finances |
|---------|-------|--------------|-------------------|
| **1. Bon de commande / OS** | Engagement juridique | Statut `BC/OS`, GED Administratif/Financier, `quote_amount_ht` | Marché / BPU, collectivité, montant HT |
| **2. Attachement travaux** | Service fait | GED Financier, photos/métrés, éventuellement timesheets MO | Quantités vs lignes `project_quote_lines` |
| **3. Facture Chorus / PDF** | Demande de paiement | PDF `pdfGenerator`, `billing_status`, acompte 30 % / solde 70 %, `invoice_deposit` / `invoice_balance` | Écart vs OS et vs attachement ; TVA 20 % |

**Statuts de facturation** :

```
À émettre → Acompte émis → Facturé total → Payé
```

**Devis** : `Brouillon` → `Envoyé au client` → `Accepté` (ou `Refusé`). L’acceptation aligne `budget_total` sur le HT.

Alerte native `facturation` : devis accepté mais facturation bloquée — file d’attente Finances.

### 2.2 Lecture des montants

| Champ | Table / vue | Sens métier |
|-------|-------------|-------------|
| `quote_amount_ht` | `projects` (sync trigger lignes) | Engagement prévisionnel BPU |
| `budget_total` | `projects` | Enveloppe affaire après acceptation |
| `budget_consumed` | `projects` | Consommé (y compris MO si suivi temps) |
| Enveloppe / Engagé / Réalisé | `ppi_planification` | AP/CP par exercice |
| Acompte / solde | `invoice_deposit`, `invoice_balance` | 30 % / 70 % |

Taux horaire MO : **45 €** HT (`LABOR_HOURLY_RATE`) — à rapprocher des attachements prestataire si le suivi temps est activé.

---

## 3. Financements complexes

### 3.1 Ventilation par code INSEE

Toute affaire porte `commune_insee_code`. C’est la **clé analytique** :

- bilans par commune (Richard : *« Budget engagé sur Pia »* / Arles `13004`) ;
- RAC (reste à charge) communal = part non couverte par subventions après ventilation ;
- isolation RLS du portail élu (l’élu ne voit **que** son INSEE).

Finances ne mélange jamais deux communes dans un même appel de fonds : un PDF, une ligne PPI, un INSEE.

### 3.2 Reste à charge (RAC) commune

Schéma type (éclairage public LED) :

| Source | Ordre d’imputation | Module SINFONI |
|--------|--------------------|----------------|
| CEE BAR-EQ-111 | Premier financement | Onglet CEE, `ceeCalculator` |
| Subvention syndicat | 30 % (règle simulateur LED) | `LedRoiSimulator` |
| FDE / Fonds Vert / Région | Pièces GED Financier + rappel dans la note | Documents affaire |
| **RAC commune** | Solde | À faire figurer dans l’offre `Proposé` pour l’élu |

Le RAC doit être **lisible par l’élu** (fiche `elu.md`) : pas de jargon Chorus, un montant et un calendrier d’appel.

### 3.3 Appels de fonds FDE / Fonds Vert / Région

SINFONI porte le **dossier** :

1. GED Financier : cerfa, notification d’attribution, états de réalisation.
2. Lien affaire + PPI (`ppi_year`, lignes Enveloppe/Engagé/Réalisé).
3. Preuves de service fait : attachements, PVR, photos.
4. Export PDF devis/facture et rapports `/rapports`.

Proposition : un **statut de subvention** par affaire (à venir) pour suivre « déposé / notifié / versé » sans quitter la fiche.

---

## 4. Cas d’usage SINFONI

### 4.1 `getBudgetSummary` — bilans consolidés par filière

Richard doit appeler **`getBudgetSummary`** dès qu’on parle budget macro.

Filtres : `communeInsee`, `filiere`, `exercice`.

Sortie attendue (posture prompt) :

1. Ligne 1 : statut visuel + **taux de consommation**.
2. Puces : **Total prévu**, **Engagé**, **Reste à engager**.
3. Relance courte.

Exemples :

- *« Synthèse financière éclairage public 2026 »*
- *« Quel est le budget engagé sur Pia ? »*
- *« Bilan IRVE de l’exercice »*

Compléter par `/analytics` (CA, marge, répartition type/statut) et `/ppi` (plafond **2 000 000 €**).

### 4.2 Préparer un dossier de paiement

1. Fiche affaire → onglet Administratif : devis accepté, acompte, solde.
2. GED Financier : BC/OS, attachement, facture PDF.
3. Contrôler l’écart BPU vs facture (automatisation § 6).
4. Si PVR manquant : renvoyer vers DST / CA (pas de solde 70 %).
5. Passage `Facturé total` → `Payé` après retour Chorus.

### 4.3 Sous-consommation et RAR

Même grille que le DGS, angle **trésorerie** :

- crédits non engagés en fin d’exercice ;
- acomptes émis non soldés ;
- affaires `Validé` sans `BC/OS` (engagement politique sans engagement juridique).

---

## 5. Modules, données et droits

| Module | Route | Usage Finances |
|--------|-------|----------------|
| Fiche affaire | `/affaires/:id` Administratif | BPU, devis, factures, PPI affaire |
| GED | `/ged` filtre Financier | Pièces de paiement et subventions |
| Analytics | `/analytics` | CA, marge (rôle DGS/DST) |
| PPI | `/ppi` | AP/CP, plafond |
| Dashboard | `/` | Alertes budget / facturation |
| Richard | Tiroir assistant | `getBudgetSummary` |

**SGBD** : `projects` (colonnes financières), `bpu_catalog`, `project_quote_lines`, `ppi_planification`, `documents`, `project_timesheets`. RLS à durcir en production sur BPU / documents / timesheets.

**SIG / maintenance** : lecture d’aide au service fait (l’ouvrage existe, le ticket est clos), pas un outil de saisie Finances.

**Workflow d’approbation** : Finances **ne valide pas** l’offre commune ; elle **bloque le paiement** si le statut n’est pas cohérent (pas de solde avant `PV/Réception`).

---

## 6. Propositions & automatisations

| Automatisation | Déclencheur | Action | Bénéfice |
|----------------|-------------|--------|----------|
| **Écart BPU vs facture** | Montant PDF / saisie facture ≠ `quote_amount_ht` (tolérance paramétrable, ex. 2 %) ou quantité ligne ≠ attachement | Alerte Finances + CA, statut facturation retenu | Évite le rejet Chorus et les mandats erronés |
| Seuil 80 % communal | Même règle que DGS | Copie Finances sur l’alerte mail/push | Anticipation AP/CP |
| Rapprochement incomplet | `Acompte émis` sans OS en GED, ou `Facturé total` sans PVR | Checklist automatique | Dossier de paiement opposable |
| Appel de fonds | Jalons PVR + pièces subvention présentes | Génération d’un état « prêt à déposer » (PDF) | FDE / Fonds Vert / Région |
| RAC élu | Recalcul si CEE ou subvention change | Mise à jour du montant affiché portail | Transparence communale |

---

## 7. Interactions avec les autres profils

| Profil | Interaction |
|--------|-------------|
| DGS | Alimente AP/CP, RAR, notes de Bureau |
| DST | PVR = service fait opposable |
| Chargé d’Affaires | Qualité du BPU et des attachements |
| Élu | RAC, calendrier d’appel de fonds, sans jargon |
| Prestataire | Facture vs OS : tout écart revient au CA puis Finances |

---

## 8. Questions à poser à Richard

- *« Synthèse financière éclairage public 2026 »* (`getBudgetSummary`)
- *« Quel est le budget engagé sur [commune] ? »*
- *« Quelles sont les responsabilités Finances sur le rapprochement tripartite dans SINFONI ? »*
- *« Quelles affaires ont la facturation bloquée ? »* (alerte `facturation`)
- *« Plafond PPI de l’année »*

**Posture attendue de Richard** : taux de consommation, totaux, reste à engager — jamais de détail SQL.
