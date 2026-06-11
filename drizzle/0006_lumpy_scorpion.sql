CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`source_url` text,
	`source_label` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
