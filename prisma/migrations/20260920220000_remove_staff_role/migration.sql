-- Preserve existing privileged users before removing STAFF from the enum.
UPDATE `User`
SET `role` = 'ADMIN'
WHERE `role` = 'STAFF';

ALTER TABLE `User`
    MODIFY `role` ENUM('USER', 'STUDENT', 'TEACHER', 'ADMIN') NOT NULL DEFAULT 'USER';
