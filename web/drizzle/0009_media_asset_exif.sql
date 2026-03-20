ALTER TABLE `media_assets` ADD COLUMN `exif_taken_at` integer;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_lat` real;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_lng` real;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_camera_make` text;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_camera_model` text;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_lens_model` text;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_aperture` real;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_shutter_speed` text;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_iso` integer;
