# Deploying Ryft

Ryft ships with [EAS](https://docs.expo.dev/eas/) (Expo Application Services). Two
GitHub Actions are wired up:

- **`.github/workflows/eas-update.yml`** — publishes an over-the-air JS/asset
  update on every push to `main` (no app-store round trip).
- **`.github/workflows/eas-build.yml`** — builds native binaries on EAS when you
  push a `v*` tag or run it manually.

## One-time setup

1. **Install the CLI and log in** (needs a free Expo account):
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Link the project** — writes `extra.eas.projectId` into `app.json`:
   ```bash
   eas init
   ```

3. **Configure updates** — writes `updates.url` + a `runtimeVersion` policy:
   ```bash
   eas update:configure
   ```

4. **Add the CI token** — create an access token at
   **expo.dev → Account settings → Access tokens**, then add it to the repo as a
   secret named **`EXPO_TOKEN`** (GitHub → Settings → Secrets → Actions).

## Building

- **Test build (internal APK)** — fastest way to get it on a phone:
  ```bash
  eas build --platform android --profile preview
  ```
- **Production build (both platforms)** — either run manually from the Actions
  tab, or:
  ```bash
  git tag v0.1.0 && git push --tags     # triggers eas-build.yml
  ```

## Shipping updates

Once native builds are installed, day-to-day JS changes go out over the air:
just push to `main` and the **EAS Update** workflow publishes to the `production`
channel. Users get it on next app launch.

## Submitting to stores

Store submission needs Apple/Google credentials and is kept manual for now:
```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

> Local dev doesn't need any of this — `npx expo start` runs everything offline.
