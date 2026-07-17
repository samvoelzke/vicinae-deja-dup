# Déjà Dup Backups

Browse, search and restore files from your [Déjà Dup](https://wiki.gnome.org/Apps/DejaDup)
backups directly from [Vicinae](https://vicinae.com) — without opening the GUI.

Déjà Dup 45+ stores its backups as a [restic](https://restic.net) repository. This extension
talks to that repository read-only, reusing the credentials Déjà Dup already saved, so there is
nothing to configure.

## Commands

- **Browse Backup** — list snapshots, drill into the file tree, preview a file, and restore
  individual files or folders (to their original location or anywhere you choose).
- **Search Backup Files** — find files by name or path across every snapshot.
- **Backup Status** — see the last backup, destination, schedule and included/excluded paths,
  and trigger a new backup.

## Supported backends

| Backend | Status |
| --- | --- |
| Local folder | ✅ |
| Google Drive | ✅ |
| rclone remote | ✅ |
| OneDrive / other | not yet |

Backups made with **duplicity** or **borg** (older Déjà Dup, or an explicit choice) are not
readable by this extension — only restic backups are.

## Requirements

- Déjà Dup with a restic backup already configured and run at least once
- `restic` and (for cloud backends) `rclone` available on `PATH`
- The GNOME keyring unlocked (open Déjà Dup once after login so the password/token are available)

All access is **read-only** on the repository (`restic --no-lock`); the extension never prunes,
forgets or writes to your backup. Restores only ever create new files in the target directory.

## How it works

Configuration (backend, target folder, schedule) is read from GSettings
(`org.gnome.DejaDup`). The repository password comes from the keyring
(`secret-tool lookup owner deja-dup type passphrase`). For Google Drive, Déjà Dup's own OAuth
refresh token is read from the keyring and exchanged for a short-lived access token, which is
cached in the extension's support directory until it expires.

## License

MIT
