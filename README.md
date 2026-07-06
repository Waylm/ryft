# Ryft

**Close the gap between you and your prime.**

Ryft is an open-source, local-first journaling app for people chasing their best self. Every day is a page — log what you executed, track your numbers, attach proof — and Ryft measures today's you against yesterday's you and against your all-time prime.

Built with Expo + React Native. Black-and-white by design. Free forever.

---

## Features (v1)

- **Grind timeline** — every logged day as a card, with a status spine that shows at a glance what you actually did.
- **Flexible day pages** — build each day however you like: checklists (skincare, routines), free-text sections (ideas, executed), numeric metrics, and photos.
- **Prime comparison** — log numbers (bench, weight, run time) and Ryft tracks your peak. See exactly how far you are from your prime, and pin standout days.
- **Reminders that bite** — schedule local notifications with a built-in pack of hard-hitting lines ("You said you would change.") or write your own.
- **Streaks** — a running count of consecutive days you showed up.
- **Monochrome light & dark** — strict black-and-white, system-aware, toggle in settings.
- **Local-first & private** — everything lives on your device in SQLite. No account required.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | [Expo](https://expo.dev) SDK 54 · React Native 0.81 · React 19 |
| Routing | Expo Router (file-based, typed routes) |
| Storage | `expo-sqlite` (local-first) with a hand-rolled migration runner |
| Notifications | `expo-notifications` (local, weekly triggers) |
| Media | `expo-image-picker` + `expo-file-system` (photos persisted on-device) |
| Type | IBM Plex Mono + IBM Plex Serif |
| Language | TypeScript (strict) |

## Getting started

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code with a device.

> Notifications and SQLite work best in a development build. `npx expo run:ios` / `npx expo run:android` (or an EAS dev build) is recommended over Expo Go for full fidelity.

## Project structure

```
app/                     # Expo Router routes
  _layout.tsx            # fonts, DB provider, theme, splash
  index.tsx              # grind timeline (main page) + onboarding gate
  onboarding.tsx         # first-launch intro
  day/[date].tsx         # day detail / editor
  prime.tsx              # you vs your prime
  reminders.tsx          # local reminder scheduling + line library
  settings.tsx           # theme + about
src/
  db/                    # schema, migrations, typed query layer
  theme/                 # monochrome tokens, ThemeProvider
  components/            # Spine, Pill, Button, day blocks, modals…
  lib/                   # date, status, prime math, notifications, media
  hooks/                 # useDayData
```

## Roadmap

Ryft is intentionally local-first for v1. Planned next:

- **Phase 2 — Sync & accounts.** Google sign-in and cross-device sync via [Supabase](https://supabase.com) (open-source Postgres + auth + storage). Photos sync to object storage.
- **CI/CD.** GitHub Actions → EAS Build & Update to ship new versions automatically.
- Metric direction awareness (lower-is-better metrics like run time).
- Richer prime narratives and progress charts.

## Contributing

Ryft is open source and contributions are welcome. Open an issue to discuss a change before sending a PR.

## License

[MIT](./LICENSE) — free to use, modify, and distribute.
