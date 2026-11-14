-- VisitHarar Phase 2 — cover images on attractions/experiences (services) and stories (news)
SET NAMES utf8mb4;

ALTER TABLE services
  ADD COLUMN cover_image VARCHAR(512) NULL AFTER icon;

ALTER TABLE news
  ADD COLUMN cover_image VARCHAR(512) NULL AFTER category;
