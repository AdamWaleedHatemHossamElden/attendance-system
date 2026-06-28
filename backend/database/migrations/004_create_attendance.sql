CREATE TABLE IF NOT EXISTS attendance (
  session_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  status ENUM('Present', 'Absent') NOT NULL DEFAULT 'Absent',
  marked_at DATETIME NULL,
  PRIMARY KEY (session_id, student_id),
  CONSTRAINT fk_attendance_session
    FOREIGN KEY (session_id) REFERENCES sessions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES students (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
