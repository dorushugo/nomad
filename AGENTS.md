# Nomad - Agent Guide

Application mobile de planification de voyages. Monorepo avec API backend et app React Native.

## Architecture

```
apps/
  api/          # Backend Hono + Prisma + Supabase (Bun runtime)
  mobile/       # React Native / Expo Router (SDK 55)
packages/
  shared/       # (vide pour l'instant)
```

## Stack technique

### API (`apps/api`)

| Couche        | Techno                                      |
|---------------|---------------------------------------------|
| Runtime       | **Bun**                                     |
| Framework     | **Hono** (routes RESTful)                   |
| ORM           | **Prisma** (PostgreSQL via Supabase)        |
| Auth          | **better-auth** + plugins `bearer`, `expo`  |
| Stockage      | **Supabase Storage** (bucket `documents`)   |
| Validation    | **Zod**                                     |
| Port par defaut | `3000`                                    |

### Mobile (`apps/mobile`)

| Couche        | Techno                                              |
|---------------|-----------------------------------------------------|
| Framework     | **Expo SDK 55** + **expo-router** (file-based)      |
| UI            | React Native pur (pas de lib UI tierce)             |
| State         | **Zustand** (`authStore`, `tripStore`)               |
| Animations    | **react-native-reanimated** 4.x                     |
| Icones        | **lucide-react-native**                              |
| Auth client   | **better-auth** + `@better-auth/expo` (SecureStore) |
| Font          | **Poppins** (400/500/600/700) via expo-google-fonts  |
| Scheme        | `nomad://`                                           |

## Scripts

### API
```bash
cd apps/api
bun dev              # Hot reload dev server
bun start            # Production
bun run db:migrate   # Prisma migrate dev
bun run db:push      # Push schema sans migration
bun run db:generate  # Regenerer le client Prisma
bun run db:studio    # Prisma Studio GUI
```

### Mobile
```bash
cd apps/mobile
npx expo start       # Dev server (Metro bundler)
npx expo start --ios # iOS simulator
```

## Variables d'environnement

### API (`apps/api/.env`)
- `DATABASE_URL` - Connection pooler PostgreSQL (Supabase)
- `DIRECT_URL` - Connexion directe PostgreSQL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth Google
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Supabase Storage
- `BETTER_AUTH_SECRET` - Secret pour better-auth
- `PORT` - Port serveur (defaut: 3000)

### Mobile (`apps/mobile/.env`)
- `EXPO_PUBLIC_API_URL` - URL de l'API (ex: `http://192.168.x.x:3000`)
- `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` - Google Places Autocomplete + Directions

## Base de donnees (Prisma)

Schema: `apps/api/prisma/schema.prisma`

```
User ──< TripUser >── Trip ──< Day ──< Item ──< Document
 │
 ├── Session
 ├── Account (credential / google)
 └── (Verification)
```

### Modeles principaux

| Modele     | Champs cles                                                                  |
|------------|------------------------------------------------------------------------------|
| `User`     | id, email, name, emailVerified, image                                        |
| `Trip`     | id, title, destination, emoji, startDate, endDate, description               |
| `TripUser` | tripId, userId, role (`"owner"`) - table pivot many-to-many                  |
| `Day`      | id, date, tripId - unique par `[tripId, date]`                               |
| `Item`     | id, type, title, startTime, endTime, location, arrivalLocation, transportMode, price, notes, link, order, dayId |
| `Document` | id, itemId, fileName, fileUrl (= storage path), fileType, fileSize           |

### Types d'items
- `activity` - Activite/visite
- `accommodation` - Hebergement
- `transport` - Transport (avion, train, voiture, bus, metro, velo, a_pied, autre)
- `note` - Note libre

## Routes API

Toutes les routes (sauf `/api/auth/**` et `/health`) passent par `authMiddleware` qui lit le header `cookie` ou `Authorization: Bearer <token>` via better-auth.

### Auth
| Methode | Route              | Description                          |
|---------|--------------------|--------------------------------------|
| POST/GET| `/api/auth/**`     | Geree par better-auth (login, signup, google, session) |
| GET     | `/health`          | Health check                         |

### Trips
| Methode | Route              | Description                          |
|---------|--------------------|--------------------------------------|
| GET     | `/trips`           | Liste des voyages du user            |
| GET     | `/trips/:id`       | Detail d'un voyage + days + items    |
| POST    | `/trips`           | Creer un voyage (auto-genere les jours) |
| PUT     | `/trips/:id`       | Modifier un voyage (owner only)      |
| DELETE  | `/trips/:id`       | Supprimer un voyage (owner only)     |
| GET     | `/trips/:id/days`  | Jours d'un voyage avec items         |

### Days
| Methode | Route              | Description                          |
|---------|--------------------|--------------------------------------|
| POST    | `/days/:id/items`  | Ajouter un item a un jour            |
| PUT     | `/days/:id`        | Modifier un jour                     |
| DELETE  | `/days/:id`        | Supprimer un jour (owner only)       |

### Items
| Methode | Route              | Description                          |
|---------|--------------------|--------------------------------------|
| PUT     | `/items/:id`       | Modifier un item                     |
| DELETE  | `/items/:id`       | Supprimer un item                    |

### Documents
| Methode | Route                              | Description                          |
|---------|------------------------------------|--------------------------------------|
| POST    | `/items/:itemId/documents/upload-url` | Obtenir une URL signee d'upload + creer le doc |
| DELETE  | `/documents/:id`                   | Supprimer un document                |

Le flow d'upload de documents :
1. Le client POST pour obtenir `{ document, uploadUrl }` (URL signee Supabase)
2. Le client PUT le fichier directement sur `uploadUrl`
3. `fileUrl` en DB stocke le path Supabase (pas une URL publique)
4. A la lecture, le serveur genere des URLs signees valides 1h

## Navigation mobile (expo-router)

```
app/
  index.tsx           # Redirect: user ? /(tabs)/ : /login
  _layout.tsx         # Root Stack layout (GestureHandler + Poppins fonts)
  login.tsx           # Ecran de connexion (email + Google)
  register.tsx        # Ecran d'inscription
  create-trip.tsx     # Wizard 4 steps (destination, titre, emoji, dates)
  (tabs)/
    _layout.tsx       # Bottom tabs: Accueil, Mes Voyages, Carte, Profil
    index.tsx         # Home: voyage en cours ou prochain voyage
    trips.tsx         # Liste de tous les voyages
    map.tsx           # Placeholder "bientot disponible"
    profile.tsx       # Profil user + stats + logout
  trip/
    [id].tsx          # Detail d'un voyage: timeline journaliere
    add-item.tsx      # Wizard 3 steps (type, details, horaires/prix)
    edit-item.tsx     # Wizard 3 steps + documents (upload/delete)
```

### Modales
`create-trip`, `add-item`, `edit-item` s'ouvrent en `presentation: "modal"` avec `slide_from_bottom`.

## Composants custom (`apps/mobile/src/components/`)

| Composant            | Role                                                      |
|----------------------|-----------------------------------------------------------|
| `Button`             | Bouton anime (primary/secondary/outline/ghost, sm/md/lg)  |
| `Input`              | TextInput avec label, focus animation, error               |
| `DatePicker`         | Picker natif iOS (spinner modal) / Android (calendar)     |
| `TimePicker`         | Picker natif iOS (compact inline) / Android (clock dialog)|
| `PlacesAutocomplete` | Google Places Autocomplete avec debounce 300ms            |
| `TripCard`           | Carte de voyage dans la liste (emoji, destination, dates) |
| `TimelineBlock`      | Block d'item sur la timeline (swipe-to-delete)            |
| `TravelIndicator`    | Indicateur de trajet entre 2 items (duree Google Directions) |
| `ItemCard`           | Carte d'item (non utilise dans la timeline actuelle)      |
| `DocumentPicker`     | Picker photo/document (ImagePicker + DocumentPicker)      |
| `DocumentList`       | Grille de documents avec preview (long press to delete)   |
| `LoadingOverlay`     | Overlay semi-transparent avec spinner                     |

## Stores Zustand (`apps/mobile/src/stores/`)

### `authStore`
- `user` / `isLoading`
- Actions: `login`, `loginWithGoogle`, `register`, `logout`, `checkSession`
- Pas de persistence (session verifiee au boot via better-auth)

### `tripStore`
- `trips` / `isLoading`
- Persiste dans `AsyncStorage` (cle: `trip-storage`)
- Actions: `fetchTrips`, `fetchTrip`, `createTrip`, `deleteTrip`, `addItem`, `updateItem`, `deleteItem`, `uploadDocument`, `deleteDocument`
- L'API client (`src/utils/api.ts`) attache automatiquement le cookie better-auth

## Theme (`apps/mobile/src/theme/index.ts`)

| Token    | Exports disponibles                                      |
|----------|----------------------------------------------------------|
| Colors   | `rose` (#FF385C) comme couleur primaire, neutrals, semantic |
| Spacing  | xxs(2) xs(4) sm(8) md(16) lg(24) xl(32) xxl(48) xxxl(64) |
| Radius   | xs(4) sm(8) md(12) lg(16) xl(24) xxl(32) full(999)       |
| Fonts    | regular, medium, semiBold, bold (Poppins)                 |
| FontSize | xxs(10) xs(12) sm(14) md(16) lg(18) xl(22) xxl(28) xxxl(36) display(48) |
| Shadow   | sm, md, lg (avec elevation Android)                       |

## Patterns et conventions

### Style
- L'UI est entierement en francais (labels, messages d'erreur, placeholders)
- Design inspire Airbnb : `colors.rose` partout, coins arrondis, shadows douces
- Toutes les animations utilisent `react-native-reanimated` (spring pour les press, timing pour les transitions)
- Les formulaires multi-etapes utilisent un pattern wizard avec progress dots et animations slide

### Code
- TypeScript partout (strict)
- Validation Zod cote API avant tout traitement
- Pas de tests unitaires pour l'instant
- Pas de monorepo manager (pas de turborepo/nx) - simple structure `apps/` + `packages/`
- Le root `package.json` ne contient aucun script, juste `"name": "nomad"`
- Les `console.log` de debug sont encore presents dans l'auth middleware et PlacesAutocomplete

### Auth flow
1. Au boot, `app/index.tsx` appelle `checkSession()` via better-auth
2. Si session valide -> redirect vers `/(tabs)/`
3. Si pas de session -> redirect vers `/login`
4. Apres login/register -> `router.replace("/(tabs)/")`
5. Apres logout -> `router.replace("/login")`
6. L'API verifie la session via `auth.api.getSession()` dans le middleware

### Timeline (trip detail)
- Grille horaire de 06:00 a 23:00 (72px par heure)
- Items positionnes par `startTime`/`endTime` en position absolue
- Long-press + drag sur la grille pour creer un item avec horaire pre-rempli
- Snap a 15 minutes
- Swipe-to-delete sur les items
- `TravelIndicator` entre items consecutifs ayant un lieu (Google Directions API)
- Items sans horaire affiches dans une section "Non planifie" en bas

### Documents
- Upload max 10 Mo (images + PDF)
- Stockes dans Supabase Storage (bucket `documents`, path: `{dayId}/{itemId}/{timestamp}_{filename}`)
- URLs signees generees a la lecture (expiration 1h)
- Disponible uniquement dans l'ecran `edit-item` (pas a la creation)
