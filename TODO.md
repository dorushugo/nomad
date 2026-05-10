## 🔐 PRIORITÉ SÉCURITÉ — Rotation des credentials (à faire dès que possible)

Les fichiers `.env` ont été committés dans l'historique git. Les credentials suivants sont exposés
et doivent être **régénérés immédiatement** dans les dashboards correspondants :

- **Supabase** : mot de passe DB + service-role key (https://app.supabase.com → Settings → API)
- **Google Cloud** : client secret OAuth (https://console.cloud.google.com → APIs & Services → Credentials)
- **BETTER_AUTH_SECRET** : générer une nouvelle valeur avec `openssl rand -base64 32`
- **Google Places API key** : régénérer + restreindre aux bundle IDs iOS/Android

Après rotation, nettoyer l'historique git avec `git filter-repo --path apps/api/.env --invert-paths`
(nécessite `pip install git-filter-repo`). Puis `git push --force` sur toutes les branches.

---

## Feature : Mode lecture / Mode édition sur la vue voyage

### Objectif

Séparer `trip/[id].tsx` en deux modes distincts afin de distinguer la consultation fluide (en voyage) de la planification.

---

### Mode lecture *(défaut à l'ouverture d'un voyage)*

- Deux vues disponibles, switchables depuis la vue :
  - **Timeline** : vue horaire actuelle (06:00–23:00)
  - **Calendrier** : vue semaine/mois scrollable — tap sur un jour pour afficher ses items
- Tap sur un item → **bottom sheet** avec le détail en lecture seule :
  - Horaires (startTime / endTime)
  - Lieu (location / arrivalLocation)
  - Mode de transport + durée trajet
  - Prix
  - Notes personnelles
  - Documents (consultation uniquement)
- Aucune action d'édition : pas de drag-to-create, pas de swipe-to-delete

---

### Mode édition

- Accessible via un **FAB** (bouton flottant) — le même FAB sert à basculer entre les deux modes
- Fonctionnalités actuelles conservées :
  - Long-press + drag sur la grille → crée un item avec horaire pré-rempli
  - Tap sur un item → écran `edit-item` (wizard 3 étapes + documents)
  - Swipe-to-delete
  - Ajout d'idées sans jour → réutilise la vue "Idées" existante
- Toutes les sauvegardes sont **immédiates** (pas de brouillon, pas d'annulation globale)

---

### Questions ouvertes

- **FAB** : icône(s) pour les deux états (crayon ↔ œil ?) et position exacte
- **Transitions** : animation / feedback visuel au changement de mode ?
- **Bottom sheet lecture** : faut-il un bouton "Modifier" dans le sheet pour basculer en mode édition directement sur cet item ?
- **Vue calendrier** : navigation entre semaines (swipe ?) ; affichage des items dans la grille calendrier (points de couleur, compteur, preview titre ?) ; gestion des voyages multi-semaines
- **Indicateur de mode** : au-delà du FAB, signaler visuellement à l'utilisateur dans quel mode il est (bandeau, couleur de header, libellé ?)

---
