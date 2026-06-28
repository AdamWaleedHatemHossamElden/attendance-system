CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  address TEXT NULL,
  phone VARCHAR(50) NOT NULL,
  birthdate DATE NULL,
  gender ENUM('Male', 'Female') NULL,
  source VARCHAR(255) NULL,
  graduation_year SMALLINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
