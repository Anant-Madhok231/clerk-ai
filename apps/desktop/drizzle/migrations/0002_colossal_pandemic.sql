ALTER TABLE `situation` ADD `dismissed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `situation` ADD `dismissal_reason` text;