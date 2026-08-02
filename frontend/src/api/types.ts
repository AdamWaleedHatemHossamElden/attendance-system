import type {
  AttendanceResponse,
  AttendanceRow,
  AttendanceStatus,
  PaginationResponse,
  ReportSummary,
  Role,
  Session,
  Student,
  StudentsResponse,
  User,
} from '../types/domain';

export type {
  AttendanceResponse,
  AttendanceRow,
  AttendanceStatus,
  PaginationResponse,
  ReportSummary,
  Role,
  Session,
  Student,
  StudentsResponse,
  User,
};

export interface AuthMeResponse {
  user: User;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

export type ApiListResponse<T> = T[];
