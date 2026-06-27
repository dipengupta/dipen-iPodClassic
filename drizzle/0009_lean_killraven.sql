CREATE TABLE `recommendation_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rec_id` integer NOT NULL,
	`track_uri` text NOT NULL,
	`title` text NOT NULL,
	`artist` text DEFAULT '' NOT NULL,
	`preview_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`service` text NOT NULL,
	`playlist_url` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
