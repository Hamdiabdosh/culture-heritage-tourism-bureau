-- Rollback for 007_institution_profile_fields.sql
-- Drops only columns added in 007. Does not touch other institution data.
-- Apply: docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/007_institution_profile_fields.rollback.sql

SET NAMES utf8mb4;

ALTER TABLE institutions
  DROP COLUMN profile_translations,
  DROP COLUMN objectives_json,
  DROP COLUMN values_json,
  DROP COLUMN history,
  DROP COLUMN vision,
  DROP COLUMN mission;
