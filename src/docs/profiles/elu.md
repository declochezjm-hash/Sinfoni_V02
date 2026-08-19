# Maire / Élu / Délégué communal

Fiche métier SINFONI — portail commune, vision territoriale simple, reste à charge et rapport d’activité.

| Attribut | Valeur |
|----------|--------|
| **Rôle applicatif** | `COMMUNE` |
| **Périmètre** | Uniquement `/commune/*` — carte, dossiers, fiche simplifiée |
| **Isolation** | `organization_id` **et** `commune_insee_code` (JWT + RLS) |
| **SIG** | Consultation patrimoine **uniquement** — pas d’import / export Shapefile |
| **Compte démo** | `c.martin@mairie-arles.fr` — INSEE **13004** (Arles) |

---

## 1. Mission

L’élu n’utilise pas SINFONI comme un ERP. Il veut savoir, **en langage clair** :

- **Quels investissements** le syndicat réalise sur **ma commune** ;
- **Où en est** chaque dossier (étude, vote, chantier, réception) ;
- **Combien reste à la charge** de la commune (RAC) ;
- **Quand** les agents interviennent (panne d’éclairage, borne IRVE) ;
- **Ce que le passage LED** change sur la facture énergétique.

Interdiction de jargon : pas de BPU, pas de Chorus, pas de `ppi_planification`. Richard (posture COMMUNE) parle de **dossier**, **prochaine action** (accepter / demander une révision), **montant** et **délai**.

---

## 2. Vision citoyenne & territoriale

### 2.1 Suivi des investissements communaux

Tout dossier vu par l’élu est **filtré INSEE**. Impossible de voir la commune voisine.

| Ce que l’élu voit | Traduction interne (ne pas afficher) |
|-------------------|--------------------------------------|
| Liste des dossiers | `projects` où `commune_insee_code` = INSEE de session |
| Carte du territoire | `CommuneCarte` : patrimoine IRVE / éclairage en lecture |
| Fiche simple | `CommuneProjectDetail` (pas les 5 onglets syndicat) |
| Offre à accepter | Statut `Proposé` + actions instruction |

Parcours :

1. Connexion → redirection automatique **`/commune/carte`**.
2. `/commune/dossiers` — affaires de la commune.
3. `/commune/dossiers/:id` — détail + accepter ou révision.

### 2.2 Transparence sur les délais d’intervention

L’élu ne gère pas le planning syndicat (`/planning` lui est fermé). Il doit malgré tout **lire un délai** :

- dates de la fiche (début, fin prévue) ;
- statut clair : *en étude*, *en attente de votre accord*, *travaux en cours*, *réception* ;
- panne signalée : demander via la carte (`?mode=demande`) plutôt que par téléphone uniquement.

Types de demande portail → type d’affaire :

| Demande élu | Type d’affaire syndicat |
|-------------|-------------------------|
| Éclairage Public | Éclairage Public |
| Extension Réseau Basse Tension | Électricité |
| Dissimulation / Effacement | Télécom |
| Borne de recharge IRVE | IRVE |

Création : clic carte → `CommuneDemandForm` → `source_demand = 'commune'`.

### 2.3 Réduction de la facture énergétique (passage LED)

Quand le syndicat instruit un dossier **Éclairage Public**, le Chargé d’Affaires dispose du simulateur LED et des CEE (BAR-EQ-111, aide syndicat 30 %). L’élu, lui, doit recevoir dans l’**offre** :

- économie estimée (langage facture d’électricité) ;
- **reste à charge** communal ;
- calendrier des travaux (moins de nuisances, rues concernées — carte).

La fiche commune ne recopie pas les formules CEE : elle affiche le **résultat** et le **bouton d’accord**.

---

## 3. Consultation ultra-simplifiée

### 3.1 Affaires en cours, sans jargon

| Statut interne | Message élu recommandé |
|----------------|------------------------|
| `Brouillon` / `En Étude` | Le syndicat prépare votre dossier |
| `Proposé` | **À votre décision** : accepter ou demander une révision |
| `Validé` / `À planifier` | Dossier accepté, planification des travaux |
| `APS/APD` / `BC/OS` | Préparation administrative et lancement |
| `En cours` | Travaux en cours sur la commune |
| `PV/Réception` | Réception de l’ouvrage |
| `Clôturé` | Dossier terminé |

**Reste à charge** : un montant, une phrase (« part communale après aides »). Pas de ventilation FDE / Fonds Vert dans l’écran élu — ces détails restent au syndicat (Finances).

### 3.2 Actions d’instruction

`ProjectInstructionActions` côté commune :

- **Accepter** → statut `Validé` (déclenche la suite syndicat : OS, travaux, facturation).
- **Demander une révision** → retour `En Étude` (le CA réouvre le BPU / l’offre).

C’est le **seul pouvoir de workflow** de l’élu dans SINFONI. Il ne clôture pas, ne saisit pas le BPU, n’importe pas de Shapefile.

### 3.3 Carte : ce qui est permis / interdit

| Action | Autorisé élu |
|--------|----------------|
| Voir bornes IRVE et candélabres | Oui |
| Déposer une demande travaux (clic) | Oui |
| Importer un ZIP Shapefile | **Non** |
| Exporter le patrimoine | **Non** |
| Déplacer un équipement | **Non** |
| Ouvrir `/analytics`, `/ppi`, `/utilisateurs` | **Non** |

---

## 4. Cas d’usage SINFONI

### 4.1 « Où en est l’éclairage de la rue X ? »

1. `/commune/dossiers` — rechercher le titre / la rue.
2. Fiche : statut en français, dates, montant / RAC.
3. Carte : point patrimoine ou demande.
4. Richard (rôle COMMUNE) : *« Statut de mon dossier IRVE »* — réponse courte, prochaine action.

### 4.2 Valider une offre avant le Conseil municipal

1. Notification : dossier `Proposé`.
2. Lire la fiche simplifiée (objet, montant communal, délai).
3. Accepter dans SINFONI **après** délibération, ou demander révision si le RAC a changé.
4. Conservation du PDF d’offre : le syndicat l’a en GED ; l’élu s’appuie sur la fiche + éventuel envoi mail.

### 4.3 Signaler une panne / un besoin

`/commune/carte?mode=demande` → formulaire → le CA récupère une affaire déjà géolocalisée et taguée INSEE.

---

## 5. Modules, données et droits

| Module | Route | Usage élu |
|--------|-------|-----------|
| Carte commune | `/commune/carte` | Patrimoine + demandes |
| Dossiers | `/commune/dossiers` | Liste filtrée INSEE |
| Fiche | `/commune/dossiers/:id` | Vue `CommuneProjectDetail` |

**SGBD** : vues `public.projects`, `public.energy_assets` avec politiques `*_org_and_commune`. Helpers JWT : `app.current_user_commune_insee_code()`, `app.is_commune_user()`.

**GED / BPU / signatures syndicat** : hors UI élu. Les pièces existent pour le syndicat ; l’élu n’administre pas la GED.

**Richard** : périmètre strictement communal — « jamais de données hors INSEE ».

---

## 6. Propositions & automatisations

| Automatisation | Déclencheur | Action | Bénéfice |
|----------------|-------------|--------|----------|
| **Rapport annuel d’activité communal** | 31/12 ou demande élu / secrétariat | PDF prêt à imprimer : dossiers clôturés, en cours, montants investis, RAC, pannes EP/IRVE traitées, carte simplifiée | Annexe au **Conseil municipal** sans retravailler l’ERP |
| Relance offre | Dossier `Proposé` > 14 jours | Notification portail + mail maire / délégué | Évite les conventions « en l’air » |
| Traduction de statut | Chaque changement de statut affaire | Phrase en français dans la fiche + notif | Zéro jargon |
| Alerte délai citoyen | `En cours` et fin prévue dépassée | Message « travaux retardés » + contact syndicat | Transparence |
| Synthèse LED | Offre EP avec simulateur renseigné | Bloc « économies estimées » sur la fiche commune | Aide à la délibération |

---

## 7. Interactions avec les autres profils

| Profil syndicat | Ce que l’élu perçoit |
|-----------------|----------------------|
| Chargé d’Affaires | Interlocuteur de l’offre et des délais |
| DST | Délai de réparation (luminaire, borne) |
| Finances | RAC et appels de fonds, formulés simplement |
| DGS | Engagements de la convention quinquennale |

L’élu **ne dialogue pas** avec le prestataire dans SINFONI (rôle `Prestataire Extérieur` = GED + tickets côté syndicat).

---

## 8. Questions à poser à Richard

- *« Où en sont les dossiers de ma commune ? »*
- *« Que dois-je accepter maintenant ? »*
- *« Quel est le reste à charge de ce dossier ? »*
- *« Quelles sont les responsabilités d’un élu dans SINFONI ? »*
- *« Comment signaler une panne d’éclairage ? »* → carte, mode demande

**Posture attendue de Richard** : statut du dossier, prochaine action (accepter / révision), langage quotidien.
