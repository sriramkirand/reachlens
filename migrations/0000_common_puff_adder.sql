CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`inviter_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_org_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`logo` text,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`meta_json` text,
	`ip_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_log` (`org_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`snippet` text,
	`score` real NOT NULL,
	`reasoning` text NOT NULL,
	`low_confidence` integer DEFAULT true NOT NULL,
	`selected` integer DEFAULT false NOT NULL,
	`rank` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `candidates_contact_idx` ON `candidates` (`org_id`,`contact_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`image_id` text NOT NULL,
	`full_name` text,
	`company` text,
	`job_title` text,
	`email` text,
	`phone` text,
	`website` text,
	`handles_json` text,
	`confidence` real,
	`bbox_json` text,
	`status` text DEFAULT 'new' NOT NULL,
	`enrichment_status` text DEFAULT 'pending' NOT NULL,
	`user_edited_json` text,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contacts_org_idx` ON `contacts` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `contacts_batch_idx` ON `contacts` (`org_id`,`batch_id`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `images_org_idx` ON `images` (`org_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `images_expiry_idx` ON `images` (`expires_at`);--> statement-breakpoint
CREATE TABLE `org_settings` (
	`org_id` text PRIMARY KEY NOT NULL,
	`retention_days` integer DEFAULT 30 NOT NULL,
	`daily_linkedin_cap` integer DEFAULT 50 NOT NULL,
	`cooldown_seconds` integer DEFAULT 20 NOT NULL,
	`email_provider` text DEFAULT 'none' NOT NULL,
	`email_config_enc` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`stripe_customer_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outreach_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`channel` text NOT NULL,
	`variant_id` text,
	`rendered_text` text,
	`target_url` text,
	`status` text DEFAULT 'drafted' NOT NULL,
	`confirmed_by` text,
	`confirmed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `actions_org_idx` ON `outreach_actions` (`org_id`,`contact_id`,`channel`);--> statement-breakpoint
CREATE TABLE `template_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`template_id` text NOT NULL,
	`label` text DEFAULT 'A' NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`max_chars` integer,
	`weight` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `variants_tpl_idx` ON `template_variants` (`org_id`,`template_id`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `templates_org_idx` ON `templates` (`org_id`,`channel`);--> statement-breakpoint
CREATE TABLE `upload_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`created_by` text NOT NULL,
	`event_name` text,
	`lawful_basis` text NOT NULL,
	`consent_notes` text,
	`source_description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `batches_org_idx` ON `upload_batches` (`org_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`period` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_org_idx` ON `usage_events` (`org_id`,`period`);--> statement-breakpoint
CREATE TABLE `usage_monthly` (
	`org_id` text NOT NULL,
	`period` text NOT NULL,
	`kind` text NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`org_id`, `period`, `kind`)
);
