# Keepsake 🌿

A personal, offline-first mobile app to stay in touch with friends and remember what you're grateful for.

Keepsake answers one central question: **"When did I last connect with this person, and why am I grateful for them?"**

---

## Features

- **"How Long Has It Been?" Dashboard (Home):** Friends ranked gently by time since last contact, prioritizing those whose stay-in-touch interval is overdue.
- **Friend Profiles:** Track birthdays, contact cadence, shared history, and planned connections.
- **Moments Timeline:** Log meetups, calls, texts, and video chats in 2 taps.
- **Gratitude Journal:** Record personal or friend-linked gratitude notes, organized by month with category tags.
- **Warm Aesthetics:** Calm terracotta, cream, and deep cocoa themes (light/dark/system) using Fraunces and Nunito typography.
- **Offline & Private:** All data is persisted locally via Zustand and AsyncStorage.

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 22)
- npm or bun

### Installation
```bash
npm install
```

### Running the App
```bash
# Start Expo development server
npx expo start

# Run specifically on web
npx expo start --web

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

### Running Tests & Verification
```bash
# Run unit tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Web bundle export verification
npx expo export --platform web
```

---

## Project Structure

```
src/
├── app/                  # Expo Router file-based screens
│   ├── (tabs)/           # Bottom navigation tabs (Home, Friends, Gratitude, Settings)
│   ├── friend/           # Friend detail and edit screens
│   ├── log-interaction.tsx # Quick moment logging modal
│   └── add-gratitude.tsx # Gratitude entry modal
├── components/           # Reusable UI components & design system primitives
├── storage/              # Offline storage adapter
├── store/                # Zustand domain slices & persistent state
├── theme/                # Palettes, typography tokens, and theme hooks
├── types/                # Domain models and TypeScript contracts
└── utils/                # Date math, derived dashboard logic, and helpers
```

---

## Product Spec & Architecture

- Product Plan & MVP Design Spec: [plan.md](plan.md)
- Implementation Plan: [docs/superpowers/plans/2026-10-07-keepsake-mvp.md](docs/superpowers/plans/2026-10-07-keepsake-mvp.md)
