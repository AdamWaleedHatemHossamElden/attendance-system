export type Role = 'admin' | 'user';

export type AttendanceStatus = 'Present' | 'Absent';

export type Gender = 'Male' | 'Female';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Student {
  id: number;
  name: string;
  father_name: string | null;
  last_name: string | null;
  address: string | null;
  phone: string;
  birthdate: string | null;
  gender: Gender | null;
  source: string | null;
  graduation_year: number | null;
  notes: string | null;
  created_at?: string;
  present_count?: number | string;
  absent_count?: number | string;
}

export interface Session {
  id: number;
  title: string;
  session_date: string;
  created_at?: string;
  present_count?: number | string;
  absent_count?: number | string;
}

export interface AttendanceRow {
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  marked_at: string | null;
  name: string;
  phone: string;
  father_name?: string | null;
  last_name?: string | null;
}

export interface ReportSummary {
  total_students: number;
  total_sessions: number;
  total_attendance: number;
}

export interface PaginationResponse<T> {
  rows: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export type StudentsResponse = PaginationResponse<Student>;
export type AttendanceResponse = PaginationResponse<AttendanceRow>;
