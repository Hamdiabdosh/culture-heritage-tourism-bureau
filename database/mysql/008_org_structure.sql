-- Phase 2.2 — departments + people (leadership profiles)
-- Additive only: creates two new tables. No seed rows (Bureau supplies verified data via CMS).
-- Requires 001_schema.sql (institutions). Safe to re-run (IF NOT EXISTS).
-- Apply: docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/008_org_structure.sql
-- Rollback: database/mysql/008_org_structure.rollback.sql
-- Photos deferred: approved design uses photo_media_id → media_assets (Phase 2.3).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  description MEDIUMTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  translations JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY departments_institution_slug_uq (institution_id, slug),
  -- Target for people's composite FK (keeps department links inside one institution).
  UNIQUE KEY departments_institution_id_uq (institution_id, id),
  KEY departments_public_idx (institution_id, status, sort_order),
  CONSTRAINT departments_translations_object_chk CHECK (JSON_TYPE(translations) = 'OBJECT'),
  CONSTRAINT departments_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS people (
  id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  department_id CHAR(36) NULL,
  slug VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  bio MEDIUMTEXT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_leadership TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  translations JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY people_institution_slug_uq (institution_id, slug),
  KEY people_leadership_idx (institution_id, is_leadership, sort_order),
  KEY people_department_idx (institution_id, department_id),
  CONSTRAINT people_translations_object_chk CHECK (JSON_TYPE(translations) = 'OBJECT'),
  CONSTRAINT people_institution_id_fk FOREIGN KEY (institution_id) REFERENCES institutions (id) ON DELETE CASCADE,
  -- NULL department_id skips the check; otherwise department must belong to the same institution.
  -- RESTRICT: a department referenced by people cannot be hard-deleted.
  CONSTRAINT people_department_fk FOREIGN KEY (institution_id, department_id)
    REFERENCES departments (institution_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
