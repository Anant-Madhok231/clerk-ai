# Releasing Clerk

## One-time GitHub setup

1. **Enable Pages**: repo Settings → Pages → Source: "GitHub Actions". `.github/workflows/pages.yml` handles the rest on every push to `main` that touches `apps/site` or `packages/*`.
2. **Branch protection (optional)**: require the `CI` workflow to pass before merging to `main`.
3. **Signing secrets (optional, for signed installers)**: add these under Settings → Secrets and variables → Actions if/when you have the credentials. Builds work without them - installers are just unsigned.
   - `MAC_CERTIFICATE_P12_BASE64`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (macOS signing + notarization)
   - `WIN_CERTIFICATE_PFX_BASE64`, `WIN_CERTIFICATE_PASSWORD` (Windows Authenticode signing)

## Cutting a release

```bash
npm version 1.0.0 --no-git-tag-version   # bump every workspace package.json manually if needed
git commit -am "release: v1.0.0"
git tag v1.0.0
git push origin main --tags
```

Pushing the `v1.0.0` tag triggers `.github/workflows/release.yml`, which:

1. Builds `Clerk-1.0.0-macOS-arm64.dmg` and `Clerk-1.0.0-macOS-x64.dmg` on `macos-latest`.
2. Builds `Clerk-Setup-1.0.0.exe` on `windows-latest`.
3. Publishes a GitHub Release at `https://github.com/Anant-Madhok231/clerk-ai/releases` with both artifacts attached and auto-generated release notes.

## Unsigned builds

Without the signing secrets above:

- **macOS**: the `.dmg` still builds and installs. On first open, Gatekeeper shows "Apple could not verify this app is free of malware" - users right-click → Open to bypass it once. Notarization (`APPLE_*` secrets) removes this warning.
- **Windows**: the `.exe` still builds and installs. SmartScreen shows an "unrecognized app" warning until it accumulates enough reputation, or until it's signed with an EV/OV certificate.

## Auto-update

`electron-updater` is not yet wired into the app shell. Unsigned builds can't safely auto-update (the updater can't verify update authenticity without a valid signature), so this is deferred until signing is in place - see `docs/architecture.md` for the reasoning. Adding it later means: publish a `latest.yml`/`latest-mac.yml` alongside the release assets (electron-builder does this automatically once code signing is configured) and call `autoUpdater.checkForUpdatesAndNotify()` from the main process.
