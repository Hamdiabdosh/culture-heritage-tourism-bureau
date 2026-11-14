-- EGWP MySQL schema (Pass 4)
-- MySQL 8+ / MariaDB 10.5+ · InnoDB · utf8mb4
-- Authority: docs/FULL_MIGRATION_MAP.md §2

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS institutions (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(64) NOT NULL,
  tagline TEXT NULL,
  description TEXT NULL,
  eyebrow VARCHAR(255) NULL,
  address TEXT NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  hours VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  image TEXT NULL,
  role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account (
  id CHAR(36) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  user_id CHAR(36) NOT NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  id_token TEXT NULL,
  access_token_expires_at DATETIME(3) NULL,
  refresh_token_expires_at DATETIME(3) NULL,
  scope TEXT NULL,
  password TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY account_user_id_idx (user_id),
  CONSTRAINT account_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PHP sessions: store hash of cookie token only (not Better Auth token column).
CREATE TABLE IF NOT EXISTS session (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY session_token_hash_uq (token_hash),
  KEY session_user_id_idx (user_id),
  CONSTRAINT session_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content MEDIUMTEXT NULL,
  translations JSON NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY pages_institution_slug_uq (institution_id, slug),
  CONSTRAINT pages_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NULL,
  content MEDIUMTEXT NULL,
  category VARCHAR(255) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY news_institution_slug_uq (institution_id, slug),
  CONSTRAINT news_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NULL,
  description MEDIUMTEXT NULL,
  category VARCHAR(255) NULL,
  responsible_office VARCHAR(255) NULL,
  eligibility TEXT NULL,
  required_documents JSON NOT NULL,
  process JSON NOT NULL,
  contact TEXT NULL,
  icon VARCHAR(32) NOT NULL DEFAULT 'file',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY services_institution_slug_uq (institution_id, slug),
  CONSTRAINT services_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NULL,
  content MEDIUMTEXT NULL,
  event_date DATETIME(3) NOT NULL,
  location VARCHAR(255) NULL,
  type VARCHAR(128) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY events_institution_slug_uq (institution_id, slug),
  CONSTRAINT events_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NULL,
  category VARCHAR(255) NULL,
  year VARCHAR(16) NULL,
  file_url TEXT NULL,
  file_type VARCHAR(64) NULL,
  file_size VARCHAR(64) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY documents_institution_slug_uq (institution_id, slug),
  CONSTRAINT documents_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
