# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nomad** - Travel planning mobile app. Monorepo with a Bun/Hono API and a React Native (Expo) mobile app. All UI text is in French.

See `AGENTS.md` for detailed architecture documentation (schema, routes, components, stores, theme tokens, patterns).

## Monorepo Structure

```
apps/api/       # Bun + Hono + Prisma + Supabase (backend)
apps/mobile/    # Expo SDK 55 + expo-router + Zustand (frontend)
packages/       # Shared code (empty for now)
```

Package manager: **npm workspaces** (no turborepo/nx). No root-level scripts.

## Development Commands

### API (`apps/api`)
```bash
cd apps/api
bun dev              # Hot reload dev server (port 3000)
bun run db:push      # Push schema to DB without migration
bun run db:migrate   # Create and apply migration
bun run db:generate  # Regenerate Prisma client after schema change
bun run db:studio    # Open Prisma Studio GUI
```

### Mobile (`apps/mobile`)
```bash
cd apps/mobile
npx expo start         # Metro dev server
npx expo start --ios   # iOS simulator
npx expo start --android
```

### Installing dependencies
```bash
# For a specific workspace:
npm install <package> -w apps/api
npm install <package> -w apps/mobile
```

## Key Technical Decisions

- **Runtime**: Bun for API (native TS, fast startup). Expo/Metro for mobile.
- **Auth**: `better-auth` with `bearer` + `expo` plugins. Mobile stores token in SecureStore. API reads from `cookie` or `Authorization: Bearer` header.
- **State**: Zustand stores (`authStore`, `tripStore`). `tripStore` persists to AsyncStorage.
- **Database**: PostgreSQL via Supabase. Prisma ORM. Schema at `apps/api/prisma/schema.prisma`.
- **File storage**: Supabase Storage with signed upload URLs. `fileUrl` in DB is a storage path, not a public URL. Server generates 1h signed URLs on read.
- **Routing**: Expo Router (file-based). Modals use `presentation: "modal"` with `slide_from_bottom`.
- **Styling**: No UI library. Pure React Native + `react-native-reanimated`. Theme tokens in `apps/mobile/src/theme/index.ts`. Primary color: `rose` (#FF385C).

## Environment Variables

### `apps/api/.env`
`DATABASE_URL`, `DIRECT_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET`, `PORT`

### `apps/mobile/.env`
`EXPO_PUBLIC_API_URL` (e.g. `http://192.168.x.x:3000`), `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

## Conventions

- All UI text (labels, placeholders, error messages) is in **French**
- TypeScript strict mode everywhere
- API validation with **Zod** before processing
- Wizard pattern for multi-step forms (`create-trip`: 4 steps, `add-item`/`edit-item`: 3 steps)
- No tests currently
- `console.log` debug statements remain in some files (auth middleware, PlacesAutocomplete)
- API routes all require auth except `/api/auth/**` and `/health`
- Transport modes defined in `apps/mobile/src/utils/transportModes.ts`: avion, train, voiture, bus, metro, velo, a_pied, autre
