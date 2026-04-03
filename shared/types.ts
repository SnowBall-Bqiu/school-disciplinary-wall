export type UserRole = 'SUPER_ADMIN' | 'TEACHER' | 'OFFICER';
export type ScoreRuleType = 'ADD' | 'DEDUCT';
export type StorageMode = 'sqlite' | 'sqljs';

export interface UserEntity {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface StudentEntity {
  id: number;
  student_no: string;
  name: string;
  initial_score: number;
  current_score: number;
  created_at: string;
}

export interface ScoreRuleEntity {
  id: number;
  type: ScoreRuleType;
  name: string;
  score_value: number;
  created_at: string;
}

export interface ScoreRecordEntity {
  id: number;
  student_id: number;
  rule_id: number | null;
  operator_id: number;
  change_value: number;
  reason: string;
  created_at: string;
  batch_id: string | null;
  is_revoked: number;
  revoked_at: string | null;
  revoked_by: number | null;
  revoke_reason: string | null;
}

export interface ClassInfoEntity {
  id: number;
  class_name: string;
  initial_class_score: number;
  current_class_score: number;
}

export interface UserSession {
  token: string;
  user: UserEntity;
}

export interface SystemModuleSettings {
  weather: boolean;
  quote: boolean;
  ranking: boolean;
  bulletin: boolean;
  classScore: boolean;
  dateTime: boolean;
}

export interface DashboardLayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardSettings {
  backgroundType: 'image' | 'video' | 'gradient';
  backgroundValue: string;
  overlayOpacity: number;
  modules: SystemModuleSettings;
  layout: DashboardLayoutItem[];
  rankingSize: number;
  reminderSize: number;
  classSlogan: string;
  showClassSlogan: boolean;
  moduleOpacity: number;
}



export interface InitPayload {
  className: string;
  initialClassScore: number;
  defaultStudentScore: number;
  storageMode: StorageMode;
  username: string;
  password: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  username: string;
  role: UserRole;
  password?: string;
}

export interface StudentPayload {
  student_no: string;
  name: string;
  initial_score: number;
}

export interface ScoreRulePayload {
  type: ScoreRuleType;
  name: string;
  score_value: number;
}

export interface ScoreActionPayload {
  studentIds: number[];
  ruleId?: number | null;
  reason: string;
  changeValue: number;
}

export interface ExportPayload {
  classInfo: ClassInfoEntity | null;
  users: Array<UserEntity & { password_hash?: string }>;
  students: StudentEntity[];
  scoreRules: ScoreRuleEntity[];
  scoreRecords: ScoreRecordEntity[];
  settings: Record<string, string>;
  storageMode: StorageMode;
}

export interface OperationLogEntity {
  id: number;
  operator_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLLBACK' | 'CANCEL_ROLLBACK' | 'APPLY_SCORE' | 'ADJUST_CLASS_SCORE' | 'IMPORT' | 'EXPORT' | 'RESET';
  target_type: 'student' | 'rule' | 'user' | 'score_record' | 'class_info' | 'settings' | 'system';
  target_id: number | null;
  details: string | null;
  previous_state: unknown | null;
  new_state: unknown | null;
  created_at: string;
}
