import type { DashboardSettings, ScoreRecordEntity, UserRole } from '@shared/types';

export interface DashboardResponse {
  classInfo: {
    class_name: string;
    current_class_score: number;
    initial_class_score: number;
  } | null;
  students: Array<{
    id: number;
    name: string;
    current_score: number;
    student_no: string;
    initial_score: number;
  }>;
  records: ScoreRecordEntity[];
  dashboardSettings: DashboardSettings;
  studentMap: Record<number, string>;
  userMap: Record<number, string>;
}

export interface SummaryResponse {
  initialized: boolean;
  storageMode: 'sqlite' | 'sqljs';
  classInfo: {
    id: number;
    class_name: string;
    initial_class_score: number;
    current_class_score: number;
  } | null;
  users: Array<{ id: number; username: string; role: UserRole; created_at: string }>;
  students: Array<{ id: number; student_no: string; name: string; initial_score: number; current_score: number; created_at: string }>;
  scoreRules: Array<{ id: number; type: 'ADD' | 'DEDUCT'; name: string; score_value: number; created_at: string }>;
  scoreRecords: ScoreRecordEntity[];
  settings: Record<string, string>;
}

export interface SessionResponse {
  token: string;
  user: { id: number; username: string; role: UserRole; created_at: string };
}

export interface ExportDataResponse {
  exportedAt: string;
  data: SummaryResponse;
}
