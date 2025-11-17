CREATE TABLE `client_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`last_activity` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `idx_session_activity` ON `client_sessions` ("last_activity" desc);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `client_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_conv_session_updated` ON `conversations` (`session_id`,"updated_at" desc);--> statement-breakpoint
CREATE INDEX `idx_conv_updated` ON `conversations` ("updated_at" desc);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_msg_conversation` ON `messages` (`conversation_id`,"created_at" asc);