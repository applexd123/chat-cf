CREATE TABLE `character_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`modified_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_card_name` ON `character_cards` (`name`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `character_card_id` text REFERENCES character_cards(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `compiled_context` text;