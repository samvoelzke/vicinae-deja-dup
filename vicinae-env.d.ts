/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
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
}