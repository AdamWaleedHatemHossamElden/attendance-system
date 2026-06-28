CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_students_name ON students (name);
CREATE INDEX idx_students_gender ON students (gender);
CREATE INDEX idx_students_graduation_year ON students (graduation_year);
CREATE INDEX idx_students_birthdate ON students (birthdate);

CREATE INDEX idx_sessions_session_date_id ON sessions (session_date, id);
CREATE INDEX idx_sessions_title ON sessions (title);

CREATE INDEX idx_attendance_student_session ON attendance (student_id, session_id);
CREATE INDEX idx_attendance_session_status ON attendance (session_id, status);
CREATE INDEX idx_attendance_student_status ON attendance (student_id, status);
