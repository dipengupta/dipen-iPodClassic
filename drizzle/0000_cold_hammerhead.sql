CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`source_label` text NOT NULL,
	`published_label` text NOT NULL,
	`published_at` text,
	`body_html` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE TABLE `fetch_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`last_fetched_at` integer
);
--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image_path` text NOT NULL,
	`category` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guitars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`image_path` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`lat` real,
	`lng` real,
	`notes_json` text DEFAULT '[]' NOT NULL,
	`photos_json` text DEFAULT '[]' NOT NULL,
	`state` text,
	`country` text
);
--> statement-breakpoint
CREATE TABLE `mugs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`gifted_by` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shortcode` text NOT NULL,
	`title` text NOT NULL,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reels_shortcode_unique` ON `reels` (`shortcode`);--> statement-breakpoint
CREATE TABLE `soundcloud_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`company` text NOT NULL,
	`dates` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tweets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`posted_at` text,
	`url` text,
	`is_sample` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `youtube_videos` (
	`video_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`published_at` text NOT NULL
);
