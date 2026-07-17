/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Déjà Dup Installation - How Déjà Dup is installed. Auto-detects by default; override if detection is wrong or you use a custom setup. */
	"dejaDupFlavor": "auto" | "native" | "flatpak" | "snap";

	/** Backup Password - Leave empty to read it from the keyring automatically. Set it only if the extension cannot find it (e.g. a Flatpak install, or a custom keyring). */
	"backupPassword": string;

	/** Automatic Indexing - When on, a new backup is indexed automatically in the background (downloads the file listing metadata over the network — scales with file count) so the first browse/search is instant. When off, you build the index on demand. */
	"autoIndex": boolean;

	/** restic Binary - Path to the restic executable (leave as 'restic' to use PATH). Ignored for Flatpak installs, which use their bundled restic. */
	"resticPath": string;

	/** rclone Binary - Path to the rclone executable (leave as 'rclone' to use PATH) */
	"rclonePath": string;

	/** restic Cache Directory - Leave empty to reuse Déjà Dup's cache at ~/.cache/deja-dup/restic */
	"cacheDir": string;
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Browse Backup */
	export type BrowseBackup = ExtensionPreferences & {
		
	}

	/** Command: Search Backup Files */
	export type SearchFiles = ExtensionPreferences & {
		
	}

	/** Command: Back Up Now */
	export type BackupStatus = ExtensionPreferences & {
		
	}

	/** Command: Refresh Search Index */
	export type IndexLatest = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: Browse Backup */
	export type BrowseBackup = {
		
	}

	/** Command: Search Backup Files */
	export type SearchFiles = {
		
	}

	/** Command: Back Up Now */
	export type BackupStatus = {
		
	}

	/** Command: Refresh Search Index */
	export type IndexLatest = {
		
	}
}