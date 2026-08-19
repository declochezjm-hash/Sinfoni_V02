# Directeur Général des Services (DGS)

Fiche métier SINFONI — pilotage, gouvernance financière et préparation des instances du syndicat d’énergie (GSI Concept).

| Attribut | Valeur |
|----------|--------|
| **Rôle applicatif** | `DGS` |
| **Périmètre** | Syndicat complet : affaires, GED, SIG, analytics, PPI, utilisateurs, conformité |
| **Portail commune** | Non (réservé au rôle `COMMUNE`) |
| **Isolation données** | `organization_id` (multi-tenant) ; pas de filtre INSEE personnel |
| **Compte démo** | `m.lefranc@syndicat.fr` |

---

## 1. Mission

Le DGS est le **garant de l’exécution politique et budgétaire** du syndicat. Dans SINFONI, il ne saisit pas les métrés ni les lignes BPU : il **arbitre**, **contrôle** et **rend compte** aux élus du Bureau et du Comité syndical.

Trois questions structurantes, à tout moment :

1. **Les autorisations de programme (AP) et crédits de paiement (CP) tiennent-ils** par commune et par filière ?
2. **Les restes à réaliser (RAR)** sont-ils maîtrisés ou glissent-ils d’un exercice sur l’autre ?
3. **Les conventions quinquennales** avec les communes sont-elles exécutées conformément aux enveloppes votées ?

---

## 2. Pilotage & gouvernance

### 2.1 Autorisations de programme (AP) et crédits de paiement (CP)

SINFONI matérialise le couple AP/CP via le **Plan Pluriannuel d’Investissement** (`/ppi`) et les lignes `ppi_planification` de chaque affaire :

| Notion métier | Traduction SINFONI | Où la lire |
|---------------|-------------------|------------|
| Enveloppe annuelle (AP) | Plafond PPI `PPI_CEILING_EUR` = **2 000 000 €** + colonne **Enveloppe** | Dashboard PPI + onglet Administratif de la fiche affaire |
| Crédits engagés (CP engagé) | Somme **Engagé** des lignes PPI + `budget_consumed` des affaires | Fiche affaire, Analytics, Richard `getBudgetSummary` |
| Réalisé (CP mandaté) | Colonne **Réalisé** PPI + facturation (`billing_status`, acompte 30 % / solde 70 %) | Onglet Administratif, PDF facture |
| Reste à réaliser (RAR) | Enveloppe − Réalisé, ou budget total − consommé | Barre `BudgetProgressBar`, synthèse Richard |

**Règle d’alerte native** (`alertEngine`) : consommation **> 90 %** du budget affaire → alerte `budget` dans le header et sur la carte.

**Proposition DGS** : abaisser le seuil de **pilotage** à **80 %** pour les enveloppes **par commune** (alerte mail/push — voir § 6), distincte de l’alerte opérationnelle à 90 %.

### 2.2 Arbitrage des restes à réaliser (RAR)

Le DGS tranche :

- **Reporter** une affaire (`ppi_year`, lignes pluriannuelles 2026 / 2027 / 2028) ;
- **Reventiler** une enveloppe entre communes (code INSEE `commune_insee_code`) ;
- **Suspendre** une affaire en statut `En Étude` ou `À planifier` si le RAR menace le plafond annuel.

Parcours type :

1. `/ppi` — détecter le dépassement du plafond 2 M€.
2. `/analytics` — CA, marge, santé du portefeuille par type (Électricité, Éclairage Public, Télécom, IRVE).
3. `/affaires` filtré par statut `En cours` / `BC/OS` — identifier les RAR « durs ».
4. Fiche affaire → onglet **Administratif** → `ProjectPpiSection` (Enveloppe / Engagé / Réalisé / Statut).
5. Demander à Richard : *« Synthèse financière éclairage public 2026 »* (`getBudgetSummary`).

### 2.3 Conventions quinquennales par commune

Chaque commune adhérente est identifiée par son **code INSEE** (ex. Arles = `13004`). Les affaires portent `commune_insee_code` : c’est le **lien de gouvernance** entre la convention et l’exécution.

Le DGS vérifie, commune par commune :

- volume d’affaires **Validé** vs **Proposé** (instruction : la commune n’a pas encore accepté) ;
- consommation de l’enveloppe conventionnelle vs budget engagé ;
- retards planning (`expected_end_date` dépassée, alerte `retard`) ;
- facturation bloquée alors que le devis est accepté (alerte `facturation`).

---

## 3. Tableau de bord DGS

| Indicateur | Lecture SINFONI | Seuil / lecture |
|------------|-----------------|-----------------|
| Délais de paiement | `billing_status` : `Acompte émis` → `Facturé total` → `Payé` | Un acompte 30 % non soldé trop longtemps = trésorerie à surveiller |
| Taux de consommation du BPU | `quote_amount_ht` (trigger depuis `project_quote_lines`) vs `budget_consumed` | Écart devis / réalisé = dérive à expliquer en Bureau |
| Sous-consommation des crédits | Engagé << Enveloppe PPI, statut encore `À planifier` ou `APS/APD` | Risque d’annulation de CP en fin d’exercice |
| Santé portefeuille | `/analytics` : répartition type / statut, marge | Support de la note de synthèse |
| Alertes carte | `/carte` filtres alertes + proximité 25 km | Vision territoriale des points chauds |
| Instances | Export conversation Richard + rapports `/rapports` | Bureau / Comité syndical |

**Widgets dashboard** (`/`) : affaires actives, budget, alertes, fil d’activité, notifications.

---

## 4. Cas d’usage SINFONI

### 4.1 Préparer le Bureau / Comité syndical

1. Ouvrir `/analytics` et `/ppi` — photographie de l’exercice.
2. Filtrer `/affaires` sur les dossiers `Proposé` (en attente d’élu) et `PV/Réception` (à clôturer).
3. Demander à **Richard** :
   - *« Synthèse financière 2026 »* ;
   - *« Budget engagé sur [commune] »* ;
   - *« Urgences maintenance »* (pour le volet exploitation).
4. Exporter la conversation Richard (bouton **Exporter** du tiroir) : amorce de **note de synthèse**.
5. Compléter par un rapport sauvegardé (`/rapports`) si le canevas est récurrent.

Richard ne rédige pas l’ordre du jour politique : il **alimente** la note avec des faits (statut, montant, échéance) sans jargon technique — posture DGS du prompt.

### 4.2 Arbitrer une convention communale sous tension

1. Identifier la commune (INSEE) et lister ses affaires.
2. Croiser PPI (enveloppe) et `getBudgetSummary` (total prévu, engagé, reste).
3. Si consommation **> 80 %** : déclencher l’alerte de gouvernance (automatisation § 6) et convoquer le Chargé d’Affaires + Finances.
4. Décision : reporter (`ppi_year`), réviser l’offre (statut `En Étude`) ou assumer le dépassement en instance.

### 4.3 Contrôler la chaîne d’instruction

Workflow d’approbation :

```
Brouillon → En Étude → Proposé → Validé → À planifier
→ APS/APD → BC/OS → En cours → PV/Réception → Clôturé
```

Le DGS surveille surtout **Proposé** (offre envoyée, commune silencieuse) et **Validé** non planifié (engagement sans OS).

---

## 5. Modules, données et droits

| Module | Route | Usage DGS |
|--------|-------|-----------|
| Tableau de bord | `/` | Vue macro, alertes, notifications |
| Affaires | `/affaires`, `/affaires/:id` | Fiche 5 onglets (Administratif, Technique, Documents, Workflow, CEE) |
| GED | `/ged` | Pièces Bureau : délibérations, conventions (catégorie Administratif / Financier) |
| Carte SIG | `/carte` | Chantiers + patrimoine IRVE/éclairage ; import/export Shapefile autorisé |
| Analytics | `/analytics` | CA, marge, santé — **DGS/DST uniquement** |
| PPI | `/ppi` | Plafond 2 M€, alertes dépassement |
| Utilisateurs | `/utilisateurs` | Gouvernance des accès |
| Conformité | `/conformite` | RGPD, journal d’audit |
| Signatures | `/signatures` | Circuit délibératif / OS (workflow démo) |

**SGBD** : le front ne lit que les vues `public.*` (jamais `app.*`). Tables utiles au DGS : `projects`, `ppi_planification`, `activity_logs`, `notifications`, `saved_reports`, `users`.

**BPU** : le DGS ne recote pas le bordereau ; il lit le **montant consolidé** `quote_amount_ht` et les PDF devis/facture (`pdfGenerator`).

**SIG** : import/export réservés DGS, DST, Chargé d’Affaires. Le DGS s’en sert pour ** piloter le patrimoine** (IRVE, éclairage `functional` / `maintenance` / `broken`), pas pour saisir des points.

---

## 6. Propositions & automatisations

| Automatisation | Déclencheur | Action | Bénéfice |
|----------------|-------------|--------|----------|
| **Alerte 80 % budget communal** | Somme engagée des affaires d’un `commune_insee_code` ≥ 80 % de l’enveloppe conventionnelle / PPI | Mail + notification push (`notifications`) au DGS, copie Finances et Chargé d’Affaires | Arbitrage **avant** l’alerte opérationnelle à 90 % |
| Note de synthèse Bureau | J−3 avant une date d’instance (paramétrable) | Richard agrège `getBudgetSummary` + alertes `budget` / `retard` / `facturation` + tickets `critical` | Dossier d’instance reproductible |
| Sous-consommation CP | Engagé < 40 % au 30/09 de l’exercice, affaire non clôturée | Alerte « crédits en sommeil » sur `/ppi` | Évite l’annulation sèche de CP |
| Relance communes silencieuses | Statut `Proposé` > 21 jours | Notification portail + mail à l’élu | Désengorge le workflow d’approbation |
| Plafond PPI | Total annuel > 2 M€ | Déjà : alerte dashboard `/ppi` | À coupler à un blocage de nouvelle AP (proposition) |

---

## 7. Interactions avec les autres profils

| Profil | Ce que le DGS attend | Ce que SINFONI montre |
|--------|----------------------|------------------------|
| DST | Taux de pannes, charge entreprises, PVR | `/maintenance`, `/planning`, carte patrimoine |
| Chargé d’Affaires | Jalons OS / attachements / pièces GED | Fiche affaire, GED, BPU |
| Finances | RAC commune, rapprochement tripartite, Chorus | `getBudgetSummary`, facturation, BPU vs facture |
| Élu | Transparence RAR et délais, sans jargon | Portail `/commune/*` (l’élu, pas le DGS) |

---

## 8. Questions à poser à Richard

- *« Quel est le budget engagé sur Pia ? »*
- *« Synthèse financière éclairage public 2026 »*
- *« Quelles sont les responsabilités du DGS sur le PPI dans SINFONI ? »*
- *« Quelles affaires dépassent 90 % de budget ? »* (alertes natives)
- *« Prépare une note de synthèse pour le Bureau »* (faits + relance vers l’export)

**Posture attendue de Richard** : statut, risque, montant, échéance — zéro jargon technique.
