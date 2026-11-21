-- Phase 2.1 — institutional profile fields on institutions
-- Additive only. Does not modify existing identity values.
-- Apply: docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/007_institution_profile_fields.sql
-- Rollback: see 007_institution_profile_fields.rollback.sql

SET NAMES utf8mb4;

ALTER TABLE institutions
  ADD COLUMN mission TEXT NULL AFTER hours,
  ADD COLUMN vision TEXT NULL AFTER mission,
  ADD COLUMN history MEDIUMTEXT NULL AFTER vision,
  ADD COLUMN values_json JSON NULL AFTER history,
  ADD COLUMN objectives_json JSON NULL AFTER values_json,
  ADD COLUMN profile_translations JSON NULL AFTER objectives_json;
