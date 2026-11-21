-- Rollback for 008_org_structure.sql
-- Drops ONLY the two tables created in 008 (people first: it references departments).
-- WARNING: deletes any departments/people entered through the CMS. Back up first.
-- Apply: docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/008_org_structure.rollback.sql

SET NAMES utf8mb4;

DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS departments;
