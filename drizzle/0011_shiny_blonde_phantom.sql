CREATE TABLE `spice_blends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`source_url` text,
	`source_label` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
