CREATE TABLE `ugg_episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode` integer NOT NULL,
	`title` text NOT NULL,
	`name` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`posted_at` text NOT NULL,
	`year` integer NOT NULL,
	`filename` text NOT NULL,
	`duration_sec` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ugg_episodes_episode_unique` ON `ugg_episodes` (`episode`);