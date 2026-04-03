import type { DashboardLayoutItem, DashboardSettings, ScoreRuleType, UserRole } from '@shared/types';
import type { SummaryResponse } from '../../types/api';

export type SettingsSection = 'class' | 'display' | 'ranking' | 'layout' | 'logs' | 'danger';

export interface StudentFormState {
  id: number;
  student_no: string;
  name: string;
  initial_score: number;
}

export interface RuleFormState {
  id: number;
  type: ScoreRuleType;
  name: string;
  score_value: number;
}

export interface ScoreFormState {
  studentIds: number[];
  ruleId: string;
  reason: string;
  changeValue: number;
}

export interface UserFormState {
  id: number;
  username: string;
  password: string;
  role: UserRole;
}

export interface AdminPermissions {
  canManageSystem: boolean;
  canReset: boolean;
  canRevoke: boolean;
  canDeleteStudents: boolean;
  canManageAnyUser: boolean;
  canManageOfficerUser: boolean;
}

export interface LayoutEditorProps {
  dashboardSettings: DashboardSettings;
  canManageSystem: boolean;
  onDashboardSettingsChange: React.Dispatch<React.SetStateAction<DashboardSettings>>;
}

export interface ScoreWorkbenchTabProps {
  summary: SummaryResponse | null;
  scoreForm: ScoreFormState;
  onScoreFormChange: React.Dispatch<React.SetStateAction<ScoreFormState>>;
  onSubmit: () => void;
}

export interface StudentsTabProps {
  studentForm: StudentFormState;
  filteredStudents: SummaryResponse['students'];
  canDeleteStudents: boolean;
  onStudentFormChange: React.Dispatch<React.SetStateAction<StudentFormState>>;
  onSubmit: () => void;
  onReset: () => void;
  onDelete: (id: number) => void;
}

export interface RulesTabProps {
  ruleForm: RuleFormState;
  filteredRules: SummaryResponse['scoreRules'];
  onRuleFormChange: React.Dispatch<React.SetStateAction<RuleFormState>>;
  onSubmit: () => void;
  onReset: () => void;
  onDelete: (id: number) => void;
}

export interface UsersTabProps {
  filteredUsers: SummaryResponse['users'];
  currentRole: UserRole;
  currentUserId: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export interface RecordsTabProps {
  records: SummaryResponse['scoreRecords'];
  studentMap: Record<number, string>;
  userMap: Record<number, string>;
  canRevoke: boolean;
  canDelete: boolean;
  onRevoke: (id: number) => void;
  onDelete: (id: number) => void;
}


export interface SettingsTabProps {
  settingsSection: SettingsSection;
  dashboardSettings: DashboardSettings;
  canManageSystem: boolean;
  classInfo: { class_name: string; initial_class_score: number; current_class_score: number } | null;
  classScoreAdjustValue: number;
  classScoreAdjustReason: string;
  onSectionChange: (section: SettingsSection) => void;
  onDashboardSettingsChange: React.Dispatch<React.SetStateAction<DashboardSettings>>;
  onSaveDashboard: () => void;
  onUpdateClassInfo: (className: string, initialClassScore: number) => void;
  onClassScoreAdjustValueChange: (value: number) => void;
  onClassScoreAdjustReasonChange: (reason: string) => void;
  onAdjustClassScore: () => void;
  logs?: any[];
  userMap?: Record<number, string>;
  onRollback?: (id: number) => void;
  onCancelRollback?: (id: number) => void;
  onDeleteLog?: (id: number) => void;
  onDeleteLogs?: (ids: number[]) => void;
  canRollback?: boolean;
  canDeleteLog?: boolean;
}

export interface UserDialogProps {
  open: boolean;
  userForm: UserFormState;
  canEditRole: boolean;
  onClose: () => void;
  onUserFormChange: React.Dispatch<React.SetStateAction<UserFormState>>;
  onSave: () => void;
}

export interface LogsTabProps {
  userMap: Record<number, string>;
  onRollback: (id: number) => void;
  onLoadMore: () => void;
  canRollback: boolean;
}

export type LayoutUpdater = (item: DashboardLayoutItem) => DashboardLayoutItem;
