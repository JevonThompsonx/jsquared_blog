CREATE UNIQUE INDEX IF NOT EXISTS `auth_accounts_provider_subject_unique`
  ON `auth_accounts` (`provider`, `provider_user_id`);
