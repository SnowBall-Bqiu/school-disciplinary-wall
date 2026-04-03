import type { UserRole } from '@shared/types';
import type { SettingsSection } from './types';

export const GRID_COLUMNS = 12;
export const GRID_ROW_HEIGHT = 72;

export const layoutLabels: Record<string, string> = {
  clock: '时间日期',
  weather: '天气',
  quote: '一言',
  classScore: '班级总分',
  ranking: '排行榜',
  bulletin: '今日通报',
};

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: '超级管理员',
  TEACHER: '老师',
  OFFICER: '班干部',
};

export const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'class', label: '班级信息' },
  { id: 'display', label: '展示设置' },
  { id: 'ranking', label: '排行榜设置' },
  { id: 'layout', label: '布局编辑' },
  { id: 'logs', label: '操作日志' },
  { id: 'danger', label: '危险地带' },
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
