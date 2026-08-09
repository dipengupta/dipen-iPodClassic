UPDATE `tweets` SET `posted_at` = '1970-01-01T00:00:00.000Z' WHERE `posted_at` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tweets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer,
	`text` text NOT NULL,
	`posted_at` text NOT NULL,
	`url` text,
	`is_sample` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tweets`("id", "number", "text", "posted_at", "url", "is_sample") SELECT "id", "number", "text", "posted_at", "url", "is_sample" FROM `tweets`;--> statement-breakpoint
DROP TABLE `tweets`;--> statement-breakpoint
ALTER TABLE `__new_tweets` RENAME TO `tweets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tweets_number_unique` ON `tweets` (`number`);