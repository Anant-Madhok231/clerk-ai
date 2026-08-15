CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `situation` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`category` text,
	`next_action` text,
	`deadline` text,
	`deadline_confidence` real,
	`amount` real,
	`currency` text,
	`waiting_on` text,
	`confidence` real NOT NULL,
	`user_confirmed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE TABLE `situation_event` (
	`id` text PRIMARY KEY NOT NULL,
	`situation_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`occurred_at` text NOT NULL,
	`payload` text,
	FOREIGN KEY (`situation_id`) REFERENCES `situation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `situation_event_situation_id_idx` ON `situation_event` (`situation_id`);--> statement-breakpoint
CREATE TABLE `situation_source` (
	`id` text PRIMARY KEY NOT NULL,
	`situation_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`role` text,
	`linked_at` text NOT NULL,
	FOREIGN KEY (`situation_id`) REFERENCES `situation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `situation_source_unique_idx` ON `situation_source` (`situation_id`,`source_item_id`);--> statement-breakpoint
CREATE INDEX `situation_source_source_item_id_idx` ON `situation_source` (`source_item_id`);--> statement-breakpoint
CREATE TABLE `source_item` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`thread_id` text,
	`sender` text,
	`subject` text,
	`snippet` text,
	`received_at` text NOT NULL,
	`file_name` text,
	`content_hash` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_item_provider_id_idx` ON `source_item` (`provider`,`provider_id`);--> statement-breakpoint
CREATE INDEX `source_item_thread_id_idx` ON `source_item` (`thread_id`);