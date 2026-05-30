# EAS Distribution Setup Guide

This guide covers setting up the Klk app for distribution to TestFlight (iOS) and Google Play (Android) using Expo Application Services (EAS).

## Prerequisites

- Expo account with access to Klk project
- Apple Developer account with Team ID
- Google Play Developer account
- `eas-cli` installed locally: `npm install -g eas-cli`

## Step 1: Initialize EAS Project

If not already done, link the project to your Expo account:

```bash
cd apps/events
eas init
```

This will:
- Create an EAS project (linked to your Expo account)
- Write the `projectId` to `app.config.ts` under `extra.eas.projectId`
- Initialize credential management

## Step 2: Configure iOS Release

### Setup Apple App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with:
   - Bundle ID: `dev.klk.app` (or your production bundle ID)
   - Platform: iOS
   - Name: Klk
   - Primary Language: English
   - Type: App
   - Category: Lifestyle

3. Create an App Store Connect API Key:
   - Go to Users and Access → Keys
   - Generate a new key with "Developer" role
   - Save the `.p8` key file
   - Note the Key ID and Issuer ID

### Setup EAS for iOS

On first build, EAS will prompt for Apple credentials. Provide:
- Apple ID
- Apple App-Specific Password (generate at appleid.apple.com → Security)
- Team ID (from Apple Developer account)

Alternatively, store credentials in environment variables:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

## Step 3: Configure Android Release

### Setup Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app with:
   - App name: Klk
   - Default language: English
   - App or game: App
   - Category: Lifestyle

3. Set up signing certificate:
   - Go to Release → Setup → App signing
   - Let Google manage app signing (recommended)
   - Note the SHA-1 fingerprint

4. Create a Google Play service account:
   - Go to Settings → API access
   - Create a new service account
   - Grant "Admin" role
   - Download the JSON key file
   - Keep this file secure — it's used for automated submissions

5. Set up app releases:
   - Internal testing track (for Play internal)
   - Beta track (optional)
   - Production track

### Setup EAS for Android

Store the Google Play service account JSON as a GitHub secret:

1. Copy the service account JSON file
2. Go to repo Settings → Secrets and variables → Actions
3. Create secret `GOOGLE_PLAY_SERVICE_ACCOUNT` with JSON contents

## Step 4: Configure GitHub Secrets

For CI/CD distribution, add these secrets to your GitHub repository:

| Secret | Value | Source |
|--------|-------|--------|
| `EXPO_TOKEN` | Expo access token | [Expo Tokens](https://expo.dev/settings/tokens) |
| `APPLE_ID` | Apple ID email | Apple account |
| `APPLE_ID_PASSWORD` | App-specific password | appleid.apple.com |
| `APPLE_TEAM_ID` | Team ID | Apple Developer account |
| `ASC_APP_ID` | App Store Connect ID | App Store Connect |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Service account JSON | Google Play Console |

## Step 5: Local Build and Test

### Build for internal distribution (Android)

```bash
cd apps/events
eas build --platform android --profile preview
```

This creates a debug build suitable for testing.

### Build for release (Android)

```bash
eas build --platform android --profile production
```

### Build for TestFlight (iOS)

```bash
eas build --platform ios --profile production
```

First iOS build requires:
- Apple credentials (ID, password, team ID)
- Bundle ID registration in App Store Connect
- Certificate management (handled by EAS)

### Submit to stores

After building, submit to App Store / Play Store:

```bash
# Android to Play internal track
eas submit --platform android --track internal

# iOS to TestFlight
eas submit --platform ios --track internal
```

## Step 6: GitHub Actions Distribution Workflow

The `.github/workflows/eas-distribution.yml` workflow automates builds and submissions:

### Trigger builds on version tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

This will:
1. Build for all platforms
2. Submit to stores automatically
3. Create a GitHub Release with build status

### Manual workflow dispatch

Go to Actions → EAS Distribution → Run workflow:
- Select platform (ios/android/all)
- Review output logs

## Troubleshooting

### Build fails with certificate errors

- Run `eas credentials` to manage certificates
- On first iOS build, EAS will create certificates automatically
- Android uses Google Play signing (no local certs needed)

### Submission fails

- Verify app record exists in App Store Connect / Play Console
- Check credentials are correct in EAS
- Review submission logs: `eas submit --latest --platform ios/android`

### Rollback a build

- Delete the build in EAS Dashboard
- Rebuild with fixes
- Re-submit

## Smallest Viable Path (P3a + P3b)

If not all accounts are ready:

### P3a — Android only (fastest to feedback)

```bash
eas build --platform android --profile production
eas submit --platform android --track internal
```

- Get feedback from Android testers immediately
- No Apple account setup required

### P3b — Add iOS later

Once Apple Developer account + App Store Connect app exist:

```bash
eas build --platform ios --profile production
eas submit --platform ios --track internal
```

## Additional Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
