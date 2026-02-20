# Salah Times

## Overview

Salah Times is a React Native (Expo) mobile application that displays Islamic prayer (salah) timetables for mosques (masjids). Users can browse masjids, search by name or city, and view detailed prayer schedules. Masjid administrators can register, log in, and update their mosque's prayer timetable. The app runs on iOS, Android, and web via Expo, with an Express backend server for API support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing and typed routes
  - `app/(tabs)/` — Main tab navigation with "Explore" (masjid list) and "My Masjid" (admin panel)
  - `app/(auth)/` — Modal auth flow with login and register screens
  - `app/masjid/[id].tsx` — Dynamic masjid detail page
  - `app/edit-timetable.tsx` — Form sheet modal for editing prayer times
- **State Management**: React Context for auth (`lib/auth-context.tsx`), TanStack React Query for server data fetching (`lib/query-client.ts`)
- **Local Data Storage**: AsyncStorage (`lib/store.ts`) handles all data persistence currently — masjids, admin sessions, auth. Seed data is auto-created on first launch. This is a local-first architecture where data lives on-device.
- **Fonts**: Poppins (400, 500, 600, 700) via `@expo-google-fonts/poppins`
- **UI Libraries**: react-native-reanimated, react-native-gesture-handler, expo-haptics, expo-blur, expo-linear-gradient, expo-glass-effect
- **Design System**: Custom color constants in `constants/colors.ts` with a green/teal primary palette

### Backend (Express)

- **Server**: Express 5 running in `server/index.ts` with CORS configuration for Replit domains
- **Routes**: Defined in `server/routes.ts` — currently minimal, with placeholder for `/api` routes
- **Storage Layer**: `server/storage.ts` has an in-memory `MemStorage` class implementing `IStorage` interface for user CRUD operations
- **Static Serving**: In production, serves a landing page from `server/templates/landing-page.html`
- **Build**: Server is bundled with esbuild to `server_dist/`

### Database (Drizzle + PostgreSQL)

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` — currently has a `users` table with id, username, password
- **Schema Validation**: drizzle-zod for generating Zod schemas from Drizzle tables
- **Migrations**: Output to `./migrations` directory, pushed via `drizzle-kit push`
- **Note**: The database schema is minimal and doesn't yet reflect the full masjid data model. The app currently uses AsyncStorage for masjid data. The intent (from attached design docs) is to migrate to a proper database (originally Firebase/Firestore was considered, but Drizzle+Postgres is configured).

### Authentication

- **Current Implementation**: Local auth via AsyncStorage — admin credentials stored on-device with simple email/password matching
- **Auth Context**: `lib/auth-context.tsx` provides `login`, `register`, `logout` functions and `admin` state
- **Admin Model**: Each admin is tied to one masjid via `masjidId`
- **No server-side auth yet** — the server has user storage scaffolding but no auth routes are wired up

### Key Data Models (from `lib/types.ts`)

- **Masjid**: id, name, city, address, adminUid, timetable, createdAt
- **Timetable**: fajr, dhuhr, asr, maghrib, isha, jummah (all string times in HH:MM format)
- **AdminUser**: uid, email, role ("admin"), masjidId

### Build & Development

- **Dev workflow**: Two processes — `expo:dev` for the Expo client and `server:dev` for the Express backend
- **Production build**: `expo:static:build` runs a custom build script (`scripts/build.js`), `server:build` bundles the server with esbuild
- **Proxy**: In development, the Expo dev server proxies through the Replit domain

## External Dependencies

- **PostgreSQL**: Required via `DATABASE_URL` environment variable for Drizzle ORM (database must be provisioned)
- **AsyncStorage**: `@react-native-async-storage/async-storage` for on-device key-value storage
- **Expo Services**: expo-location (available but usage not fully visible in provided files), expo-image-picker, expo-crypto (used for UUID generation in local store)
- **TanStack React Query**: Data fetching/caching layer configured to hit the Express API via `EXPO_PUBLIC_DOMAIN`
- **No external APIs or third-party services** are currently integrated (no Firebase, no external prayer time APIs)