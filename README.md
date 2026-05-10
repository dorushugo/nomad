# Nomad

Application mobile de planification de voyages. Monorepo npm workspaces.

## Workspaces

```
apps/
  api/           # Backend Hono + Prisma + Supabase (Bun runtime)
  mobile/        # React Native / Expo Router (SDK 55)
packages/
  shared/        # Schemas zod + types partagés API ↔ mobile
```

## Prérequis

- [Bun](https://bun.sh/) ≥ 1.1 (runtime API)
- Node.js ≥ 20 (Expo + outillage)
- npm ≥ 10 (workspaces)

## Installation

Une seule commande à la racine :

```bash
npm install
```

Cela installe les deps de tous les workspaces et active les hooks git via `lefthook`.

## Variables d'environnement

Copier les exemples et les remplir :

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env.local
```

Voir [CLAUDE.md](CLAUDE.md) pour la liste détaillée des variables.

## Scripts racine

| Commande              | Effet                                              |
|-----------------------|----------------------------------------------------|
| `npm run lint`        | Biome check sur tout le repo                       |
| `npm run format`      | Biome check + auto-fix                             |
| `npm run typecheck`   | `tsc --noEmit` dans chaque workspace               |
| `npm run test`        | Tests dans chaque workspace (`bun test`, jest…)    |

## Scripts par app

### API (`apps/api`)

```bash
cd apps/api
bun dev              # Hot reload sur :3000
bun run db:migrate   # Prisma migrate dev
bun run db:generate  # Regen client Prisma
bun run db:studio    # GUI Prisma
bun test             # Tests
```

### Mobile (`apps/mobile`)

```bash
cd apps/mobile
npx expo start --ios     # Dev iOS
npx expo start --android # Dev Android
```

## Outillage

- **Biome** — lint + format (config: [biome.json](biome.json))
- **lefthook** — pre-commit qui lance `biome check --write` sur les fichiers stagés
- **TypeScript strict** partout via [tsconfig.base.json](tsconfig.base.json)

## Architecture & conventions

Voir [CLAUDE.md](CLAUDE.md) pour le détail de l'architecture, les routes API, la navigation mobile, les composants et les patterns de code.
