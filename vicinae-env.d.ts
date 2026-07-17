/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Automatic Indexing - When on, a new backup is indexed automatically (~80 MB of metadata over the network) so the first browse/search is instant. When off, you build the index on demand. */
	"autoIndex": boolean;

	/** restic Binary - Path to the restic executable (leave as 'restic' to use PATH) */
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