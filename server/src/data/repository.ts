import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import initSqlJs from 'sql.js';
import { defaultDashboardSettings } from '@shared/defaults';

import type {
  ClassInfoEntity,
  CreateUserPayload,
  DashboardSettings,
  ExportPayload,
  InitPayload,
  OperationLogEntity,
  ScoreActionPayload,
  ScoreRecordEntity,
  ScoreRuleEntity,
  ScoreRulePayload,
  StorageMode,
  StudentEntity,
  StudentPayload,
  UpdateUserPayload,
  UserEntity,
} from '@shared/types';
import { comparePassword, hashPassword, nowIso, randomId } from '../utils/security';

export interface AppStateSnapshot {
  initialized: boolean;
  storageMode: StorageMode;
  classInfo: ClassInfoEntity | null;
  users: UserEntity[];
  students: StudentEntity[];
  scoreRules: ScoreRuleEntity[];
  scoreRecords: ScoreRecordEntity[];
  settings: Record<string, string>;
}

type UserRow = { id: number; username: string; password_hash: string; role: UserEntity['role']; created_at: string };
type SettingRow = { setting_key: string; setting_value: string; updated_at: string };

type SqlParam = string | number | null | Uint8Array | Buffer;

type Engine = {
  run: (sql: string, params?: SqlParam[]) => void | Promise<void>;
  get: <T>(sql: string, params?: SqlParam[]) => T | undefined | Promise<T | undefined>;
  all: <T>(sql: string, params?: SqlParam[]) => T[] | Promise<T[]>;
};


function dataDir() {
  return path.resolve(process.cwd(), 'server/data');
}

function sqlitePath() {
  return path.join(dataDir(), 'app.db');
}

function sqlJsPath() {
  return path.join(dataDir(), 'app.sqljs.bin');
}

function ensureDataDir() {
  fs.mkdirSync(dataDir(), { recursive: true });
}

class SqliteBridge {
  private db: DatabaseSync;

  constructor() {
    ensureDataDir();
    this.db = new DatabaseSync(sqlitePath());
  }

  run(sql: string, params: SqlParam[] = []) {
    this.db.prepare(sql).run(...params);
  }

  get<T>(sql: string, params: SqlParam[] = []) {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T>(sql: string, params: SqlParam[] = []) {
    return this.db.prepare(sql).all(...params) as T[];
  }

}

class SqlJsBridge {
  private db!: any;
  private SQL!: Awaited<ReturnType<typeof initSqlJs>>;


  async init() {
    ensureDataDir();
    this.SQL = await initSqlJs({});
    if (fs.existsSync(sqlJsPath())) {
      const content = fs.readFileSync(sqlJsPath());
      this.db = new this.SQL.Database(new Uint8Array(content));
    } else {
      this.db = new this.SQL.Database();
    }
  }

  run(sql: string, params: SqlParam[] = []) {
    this.db.run(sql, params);
    this.persist();
  }


  all<T>(sql: string, params: SqlParam[] = []) {
    const result = this.db.exec(sql, params)[0];
    if (!result) return [] as T[];
    return result.values.map((values: any[]) => {
      const row: Record<string, SqlParam> = {};
      result.columns.forEach((column: string, index: number) => {
        row[column] = values[index] as SqlParam;
      });
      return row as T;
    });
  }


  get<T>(sql: string, params: SqlParam[] = []) {
    return this.all<T>(sql, params)[0];
  }


  persist() {
    fs.writeFileSync(sqlJsPath(), Buffer.from(this.db.export()));
  }
}

export class AppRepository {
  private sqlite = new SqliteBridge();
  private sqljs = new SqlJsBridge();
  private storageMode: StorageMode = 'sqlite';

  async init() {
    ensureDataDir();
    await this.sqljs.init();
    this.bootstrapEngine(this.sqlite);
    this.storageMode = this.getMetaValue('storage_mode', 'sqlite') as StorageMode;
    this.bootstrapEngine(this.engine());
  }

  private bootstrapEngine(engine: Engine) {
    const statements = [
      'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, student_no TEXT UNIQUE NOT NULL, name TEXT NOT NULL, initial_score INTEGER NOT NULL, current_score INTEGER NOT NULL, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS score_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, name TEXT NOT NULL, score_value REAL NOT NULL, class_score_value REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS score_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, rule_id INTEGER, operator_id INTEGER NOT NULL, change_value INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, batch_id TEXT, is_revoked INTEGER NOT NULL DEFAULT 0, revoked_at TEXT, revoked_by INTEGER, revoke_reason TEXT)',
      'CREATE TABLE IF NOT EXISTS class_info (id INTEGER PRIMARY KEY CHECK (id = 1), class_name TEXT NOT NULL, initial_class_score INTEGER NOT NULL, current_class_score INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS operation_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, operator_id INTEGER NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id INTEGER, details TEXT, previous_state TEXT, new_state TEXT, created_at TEXT NOT NULL)',
    ];
    for (const sql of statements) {
      engine.run(sql);
    }
    this.setMetaValue('storage_mode', this.storageMode, 'sqlite');
  }

  private engine(mode = this.storageMode) {
    return mode === 'sqlite' ? this.sqlite : this.sqljs;
  }

  getMetaValue(key: string, fallback = '') {
    const row = this.sqlite.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
    return row?.value ?? fallback;
  }

  setMetaValue(key: string, value: string, mode: StorageMode = this.storageMode) {
    const timestamp = nowIso();
    const db = this.engine(mode);
    db.run('INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?, ?, ?)', [key, value, timestamp]);
    if (mode !== 'sqlite') {
      this.sqlite.run('INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?, ?, ?)', [key, value, timestamp]);
    }
  }

  async setStorageMode(mode: StorageMode) {
    this.storageMode = mode;
    this.bootstrapEngine(this.engine(mode));
    this.setMetaValue('storage_mode', mode, mode);
    this.setMetaValue('storage_mode', mode, 'sqlite');
  }

  async isInitialized() {
    const user = this.engine().get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    return Number(user?.count ?? 0) > 0;
  }

  async initialize(payload: InitPayload) {
    await this.setStorageMode(payload.storageMode);
    const db = this.engine();
    for (const table of ['users', 'students', 'score_rules', 'score_records', 'class_info', 'system_settings']) {
      db.run(`DELETE FROM ${table}`);
    }
    const createdAt = nowIso();
    db.run('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)', [payload.username, hashPassword(payload.password), 'SUPER_ADMIN', createdAt]);
    db.run('INSERT INTO class_info (id, class_name, initial_class_score, current_class_score) VALUES (1, ?, ?, ?)', [payload.className, payload.initialClassScore, payload.initialClassScore]);
    await this.upsertSetting('default_student_score', String(payload.defaultStudentScore));
    await this.upsertSetting('dashboard_settings', JSON.stringify(defaultDashboardSettings));
    return this.getSummary();
  }

  async login(username: string, password: string) {
    const row = this.engine().get<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
    if (!row || !comparePassword(password, row.password_hash)) {
      return null;
    }
    const { password_hash: _passwordHash, ...user } = row;
    return user;
  }

  async getSummary() {
    const classInfo = this.engine().get<ClassInfoEntity>('SELECT * FROM class_info WHERE id = 1') ?? null;
    const users = this.engine().all<UserEntity>('SELECT id, username, role, created_at FROM users ORDER BY id DESC');
    const students = this.engine().all<StudentEntity>('SELECT * FROM students ORDER BY current_score DESC, id ASC');
    const scoreRules = this.engine().all<ScoreRuleEntity>('SELECT * FROM score_rules ORDER BY id DESC');
    const scoreRecords = this.engine().all<ScoreRecordEntity>('SELECT * FROM score_records ORDER BY id DESC');
    const settingsRows = this.engine().all<SettingRow>('SELECT * FROM system_settings');
    return {
      initialized: await this.isInitialized(),
      storageMode: this.storageMode,
      classInfo,
      users,
      students,
      scoreRules,
      scoreRecords,
      settings: Object.fromEntries(settingsRows.map((item: SettingRow) => [item.setting_key, item.setting_value])),
    } satisfies AppStateSnapshot;
  }



  async upsertSetting(key: string, value: string) {
    this.engine().run('INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)', [key, value, nowIso()]);
  }

  async getDashboardSettings(): Promise<DashboardSettings> {
    const row = this.engine().get<SettingRow>('SELECT * FROM system_settings WHERE setting_key = ?', ['dashboard_settings']);
    if (!row) return defaultDashboardSettings;
    const parsed = JSON.parse(row.setting_value) as Partial<DashboardSettings>;
    return {
      ...defaultDashboardSettings,
      ...parsed,
      modules: {
        ...defaultDashboardSettings.modules,
        ...(parsed.modules ?? {}),
      },
    };
  }

  async createUser(payload: CreateUserPayload, operatorId?: number) {
    this.engine().run('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)', [payload.username, hashPassword(payload.password), payload.role, nowIso()]);
    const result = this.engine().get<{ id: number }>('SELECT last_insert_rowid() as id');
    if (operatorId) {
      await this.logOperation(operatorId, 'CREATE', 'user', result?.id, `创建用户: ${payload.username} (${payload.role})`, undefined, { username: payload.username, role: payload.role });
    }
    return this.getSummary();
  }

  async updateUser(id: number, payload: UpdateUserPayload, operatorId?: number) {
    const current = this.engine().get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    if (!current) {
      throw new Error('用户不存在。');
    }
    const passwordHash = payload.password ? hashPassword(payload.password) : current.password_hash;
    this.engine().run('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?', [payload.username, payload.role, passwordHash, id]);
    if (operatorId) {
      await this.logOperation(operatorId, 'UPDATE', 'user', id, `更新用户: ${payload.username}`, { username: current.username, role: current.role }, { username: payload.username, role: payload.role });
    }
    return this.getSummary();
  }

  async deleteUser(id: number, operatorId?: number) {
    const current = this.engine().get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    if (current && operatorId) {
      await this.logOperation(operatorId, 'DELETE', 'user', id, `删除用户: ${current.username}`, { username: current.username, role: current.role, password_hash: current.password_hash });
    }
    this.engine().run('DELETE FROM users WHERE id = ?', [id]);
    return this.getSummary();
  }

  async createStudent(payload: StudentPayload, operatorId?: number) {
    this.engine().run('INSERT INTO students (student_no, name, initial_score, current_score, created_at) VALUES (?, ?, ?, ?, ?)', [payload.student_no, payload.name, payload.initial_score, payload.initial_score, nowIso()]);
    const result = this.engine().get<{ id: number }>('SELECT last_insert_rowid() as id');
    if (operatorId) {
      await this.logOperation(operatorId, 'CREATE', 'student', result?.id, `添加学生: ${payload.name} (${payload.student_no})`, undefined, { student_no: payload.student_no, name: payload.name, initial_score: payload.initial_score });
    }
    return this.recalculateClassScore();
  }

  async updateStudent(id: number, payload: StudentPayload, operatorId?: number) {
    const current = this.engine().get<StudentEntity>('SELECT * FROM students WHERE id = ?', [id]);
    if (current && operatorId) {
      await this.logOperation(operatorId, 'UPDATE', 'student', id, `更新学生: ${payload.name}`, { student_no: current.student_no, name: current.name, initial_score: current.initial_score }, { student_no: payload.student_no, name: payload.name, initial_score: payload.initial_score });
    }
    this.engine().run('UPDATE students SET student_no = ?, name = ?, initial_score = ? WHERE id = ?', [payload.student_no, payload.name, payload.initial_score, id]);
    return this.recalculateStudentScores();
  }

  async deleteStudent(id: number, operatorId?: number) {
    const current = this.engine().get<StudentEntity>('SELECT * FROM students WHERE id = ?', [id]);
    if (current && operatorId) {
      await this.logOperation(operatorId, 'DELETE', 'student', id, `删除学生: ${current.name} (${current.student_no})`, { student_no: current.student_no, name: current.name, initial_score: current.initial_score, current_score: current.current_score });
    }
    this.engine().run('DELETE FROM score_records WHERE student_id = ?', [id]);
    this.engine().run('DELETE FROM students WHERE id = ?', [id]);
    return this.recalculateClassScore();
  }

  async saveRule(payload: ScoreRulePayload, id?: number, operatorId?: number) {
    let ruleId = id;
    if (id) {
      const current = this.engine().get<ScoreRuleEntity>('SELECT * FROM score_rules WHERE id = ?', [id]);
      if (current && operatorId) {
        await this.logOperation(operatorId, 'UPDATE', 'rule', id, `更新规则: ${payload.name}`, { type: current.type, name: current.name, score_value: current.score_value, class_score_value: current.class_score_value }, payload);
      }
      this.engine().run('UPDATE score_rules SET type = ?, name = ?, score_value = ? WHERE id = ?', [payload.type, payload.name, payload.score_value, id]);
    } else {
      this.engine().run('INSERT INTO score_rules (type, name, score_value, class_score_value, created_at) VALUES (?, ?, ?, ?, ?)', [payload.type, payload.name, payload.score_value, payload.class_score_value, nowIso()]);
      const result = this.engine().get<{ id: number }>('SELECT last_insert_rowid() as id');
      ruleId = result?.id;
      if (operatorId) {
        await this.logOperation(operatorId, 'CREATE', 'rule', ruleId, `添加规则: ${payload.name}`, undefined, payload);
      }
    }
    return this.getSummary();
  }

  async deleteRule(id: number, operatorId?: number) {
    const current = this.engine().get<ScoreRuleEntity>('SELECT * FROM score_rules WHERE id = ?', [id]);
    if (current && operatorId) {
      await this.logOperation(operatorId, 'DELETE', 'rule', id, `删除规则: ${current.name}`, { type: current.type, name: current.name, score_value: current.score_value, class_score_value: current.class_score_value });
    }
    this.engine().run('DELETE FROM score_rules WHERE id = ?', [id]);
    return this.getSummary();
  }

  async applyScoreAction(payload: ScoreActionPayload, operatorId: number) {
    const batchId = randomId('batch');
    for (const studentId of payload.studentIds) {
      this.engine().run('INSERT INTO score_records (student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [studentId, payload.ruleId ?? null, operatorId, payload.changeValue, payload.reason, nowIso(), batchId]);
    }
    // 如果有班级扣分，记录班级分数变动
    if (payload.classChangeValue && payload.classChangeValue !== 0) {
      this.engine().run('INSERT INTO score_records (student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [0, payload.ruleId ?? null, operatorId, payload.classChangeValue, `班级扣分: ${payload.reason}`, nowIso(), batchId]);
    }
    const studentNames = payload.studentIds.length <= 3
      ? payload.studentIds.join(', ')
      : `${payload.studentIds.slice(0, 3).join(',')}...`;
    const classScoreText = payload.classChangeValue ? `, 班级扣分: ${payload.classChangeValue}` : '';
    await this.logOperation(operatorId, 'APPLY_SCORE', 'score_record', null, `加扣分: ${payload.changeValue > 0 ? '+' : ''}${payload.changeValue}分${classScoreText}, 学生: ${studentNames}, 原因: ${payload.reason}`);
    // 先重新计算学生分数，再重新计算班级分数（如果有班级扣分）
    await this.recalculateStudentScores();
    if (payload.classChangeValue && payload.classChangeValue !== 0) {
      return this.recalculateClassScore();
    }
    return this.getSummary();
  }

  async adjustClassScore(changeValue: number, operatorId: number, reason: string) {
    this.engine().run('INSERT INTO score_records (student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [0, null, operatorId, changeValue, reason, nowIso(), randomId('class')]);
    await this.logOperation(operatorId, 'ADJUST_CLASS_SCORE', 'class_info', 1, `调整班级总分: ${changeValue > 0 ? '+' : ''}${changeValue}, 原因: ${reason}`);
    return this.recalculateClassScore();
  }

  async revokeScoreRecord(id: number, revokedBy: number, revokeReason: string) {
    this.engine().run('UPDATE score_records SET is_revoked = 1, revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ?', [nowIso(), revokedBy, revokeReason, id]);
    await this.logOperation(revokedBy, 'UPDATE', 'score_record', id, `撤销记录, 原因: ${revokeReason}`);
    return this.recalculateStudentScores();
  }

  async deleteScoreRecord(id: number, operatorId?: number) {
    if (operatorId) {
      await this.logOperation(operatorId, 'DELETE', 'score_record', id, '删除评分记录');
    }
    this.engine().run('DELETE FROM score_records WHERE id = ?', [id]);
    return this.recalculateStudentScores();
  }

  async updateClassInfo(payload: { class_name: string; initial_class_score: number }, operatorId?: number) {
    const current = this.engine().get<ClassInfoEntity>('SELECT * FROM class_info WHERE id = 1');
    if (current && operatorId) {
      await this.logOperation(operatorId, 'UPDATE', 'class_info', 1, `更新班级信息: ${payload.class_name}`, { class_name: current.class_name, initial_class_score: current.initial_class_score }, payload);
    }
    this.engine().run('UPDATE class_info SET class_name = ?, initial_class_score = ? WHERE id = 1', [payload.class_name, payload.initial_class_score]);
    return this.recalculateClassScore();
  }

  async resetAll(operatorId?: number) {
    if (operatorId) {
      await this.logOperation(operatorId, 'RESET', 'system', null, '重置班级数据');
    }
    this.engine().run('DELETE FROM students');
    this.engine().run('DELETE FROM score_rules');
    this.engine().run('DELETE FROM score_records');
    await this.upsertSetting('dashboard_settings', JSON.stringify(defaultDashboardSettings));
    return this.recalculateClassScore();
  }

  async saveDashboardSettings(settings: DashboardSettings, operatorId?: number): Promise<DashboardSettings> {
    const current = await this.getDashboardSettings();
    await this.upsertSetting('dashboard_settings', JSON.stringify(settings));
    if (operatorId) {
      await this.logOperation(operatorId, 'UPDATE', 'settings', null, '更新大屏设置', current, settings);
    }
    return settings;
  }

  async exportData(): Promise<ExportPayload> {
    const classInfo = this.engine().get<ClassInfoEntity>('SELECT * FROM class_info WHERE id = 1') ?? null;
    const users = this.engine().all<UserRow>('SELECT id, username, role, created_at, password_hash FROM users ORDER BY id ASC') as Array<UserEntity & { password_hash?: string }>;

    const students = this.engine().all<StudentEntity>('SELECT * FROM students ORDER BY id ASC');
    const scoreRules = this.engine().all<ScoreRuleEntity>('SELECT * FROM score_rules ORDER BY id ASC');
    const scoreRecords = this.engine().all<ScoreRecordEntity>('SELECT * FROM score_records ORDER BY id ASC');
    const settingsRows = this.engine().all<SettingRow>('SELECT * FROM system_settings');
    return {
      classInfo,
      users,
      students,
      scoreRules,
      scoreRecords,
      settings: Object.fromEntries(settingsRows.map((item: SettingRow) => [item.setting_key, item.setting_value])),
      storageMode: this.storageMode,
    };
  }


  async importData(payload: ExportPayload, operatorId?: number) {
    if (operatorId) {
      await this.logOperation(operatorId, 'IMPORT', 'system', null, '导入数据');
    }
    const db = this.engine();
    // 使用参数化查询，表名通过白名单验证
    const allowedTables = ['score_records', 'score_rules', 'students', 'users', 'class_info', 'system_settings'];
    for (const table of allowedTables) {
      // 使用参数化查询防止SQL注入，表名通过白名单验证
      db.run('DELETE FROM ' + table);
    }

    if (payload.classInfo) {
      db.run('INSERT INTO class_info (id, class_name, initial_class_score, current_class_score) VALUES (?, ?, ?, ?)', [1, payload.classInfo.class_name, payload.classInfo.initial_class_score, payload.classInfo.current_class_score]);
    }

    for (const user of payload.users) {
      db.run('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', [user.id, user.username, user.password_hash ?? hashPassword('1234'), user.role, user.created_at]);
    }

    for (const student of payload.students) {
      db.run('INSERT INTO students (id, student_no, name, initial_score, current_score, created_at) VALUES (?, ?, ?, ?, ?, ?)', [student.id, student.student_no, student.name, student.initial_score, student.current_score, student.created_at]);
    }

    for (const rule of payload.scoreRules) {
      db.run('INSERT INTO score_rules (id, type, name, score_value, class_score_value, created_at) VALUES (?, ?, ?, ?, ?, ?)', [rule.id, rule.type, rule.name, rule.score_value, rule.class_score_value, rule.created_at]);
    }

    for (const record of payload.scoreRecords) {
      db.run('INSERT INTO score_records (id, student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked, revoked_at, revoked_by, revoke_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [record.id, record.student_id, record.rule_id, record.operator_id, record.change_value, record.reason, record.created_at, record.batch_id, record.is_revoked, record.revoked_at, record.revoked_by, record.revoke_reason]);
    }

    for (const [key, value] of Object.entries(payload.settings)) {
      db.run('INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)', [key, value, nowIso()]);
    }

    await this.setStorageMode(payload.storageMode);
    return this.recalculateStudentScores();
  }

  async recalculateStudentScores() {
    const students = this.engine().all<StudentEntity>('SELECT * FROM students');
    for (const student of students) {
      const total = this.engine().get<{ total: number }>('SELECT COALESCE(SUM(change_value), 0) as total FROM score_records WHERE student_id = ? AND is_revoked = 0', [student.id]);
      const currentScore = student.initial_score + Number(total?.total ?? 0);
      this.engine().run('UPDATE students SET current_score = ? WHERE id = ?', [currentScore, student.id]);
    }
    return this.recalculateClassScore();
  }

  async recalculateClassScore() {
    const classInfo = this.engine().get<ClassInfoEntity>('SELECT * FROM class_info WHERE id = 1');
    if (classInfo) {
      // 只计算班级扣分记录（student_id = 0）
      const total = this.engine().get<{ total: number }>('SELECT COALESCE(SUM(change_value), 0) as total FROM score_records WHERE student_id = 0 AND is_revoked = 0');
      const currentClassScore = classInfo.initial_class_score + Number(total?.total ?? 0);
      this.engine().run('UPDATE class_info SET current_class_score = ? WHERE id = 1', [currentClassScore]);
    }
    return this.getSummary();
  }

  // 操作日志相关方法
  async logOperation(operatorId: number, action: string, targetType: string, targetId?: number | null, details?: string | null, previousState?: unknown, newState?: unknown) {
    this.engine().run(
      'INSERT INTO operation_logs (operator_id, action, target_type, target_id, details, previous_state, new_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [operatorId, action, targetType, targetId ?? null, details ?? null, previousState ? JSON.stringify(previousState) : null, newState ? JSON.stringify(newState) : null, nowIso()]
    );
  }

  async getOperationLogs(limit = 100, offset = 0): Promise<{ logs: OperationLogEntity[]; total: number }> {
    type LogRow = OperationLogEntity & { previous_state: string | null; new_state: string | null };
    const logs = this.engine().all<LogRow>(
      'SELECT * FROM operation_logs ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const countResult = this.engine().get<{ total: number }>('SELECT COUNT(*) as total FROM operation_logs');
    return {
      logs: logs.map((log: LogRow) => ({
        ...log,
        previous_state: log.previous_state ? JSON.parse(log.previous_state) : null,
        new_state: log.new_state ? JSON.parse(log.new_state) : null,
      })),
      total: Number(countResult?.total ?? 0),
    };
  }

  async getOperationLogById(id: number): Promise<OperationLogEntity | null> {
    const log = this.engine().get<OperationLogEntity & { previous_state: string | null; new_state: string | null }>('SELECT * FROM operation_logs WHERE id = ?', [id]);
    if (!log) return null;
    return {
      ...log,
      previous_state: log.previous_state ? JSON.parse(log.previous_state) : null,
      new_state: log.new_state ? JSON.parse(log.new_state) : null,
    };
  }

  async rollbackOperation(logId: number, operatorId: number): Promise<boolean> {
    const log = await this.getOperationLogById(logId);
    if (!log) {
      return false;
    }

    // ROLLBACK 类型的记录使用取消回滚逻辑
    if (log.action === 'ROLLBACK') {
      return this.cancelRollback(logId, operatorId);
    }

    // 对于 UPDATE 和 DELETE 操作需要 previous_state
    if ((log.action === 'UPDATE' || log.action === 'DELETE') && !log.previous_state) {
      return false;
    }

    // CANCEL_ROLLBACK 不能再回滚
    if (log.action === 'CANCEL_ROLLBACK') {
      return false;
    }


    const previousState = log.previous_state as Record<string, unknown> | null;
    const newState = log.new_state as Record<string, unknown> | null;

    switch (log.target_type) {
      case 'student':
        if (log.action === 'CREATE' && log.target_id !== null && newState) {
          this.engine().run('DELETE FROM students WHERE id = ?', [log.target_id]);
        } else if (log.action === 'UPDATE' && log.target_id !== null && previousState) {
          this.engine().run('UPDATE students SET student_no = ?, name = ?, initial_score = ? WHERE id = ?', [
            String(previousState.student_no ?? ''),
            String(previousState.name ?? ''),
            Number(previousState.initial_score ?? 0),
            log.target_id,
          ]);
        } else if (log.action === 'DELETE' && log.target_id !== null && previousState) {
          this.engine().run('INSERT INTO students (id, student_no, name, initial_score, current_score, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
            log.target_id,
            String(previousState.student_no ?? ''),
            String(previousState.name ?? ''),
            Number(previousState.initial_score ?? 0),
            Number(previousState.current_score ?? 0),
            nowIso(),
          ]);
        } else {
          return false;
        }
        await this.recalculateStudentScores();
        break;

      case 'rule':
        if (log.action === 'CREATE' && log.target_id !== null && newState) {
          this.engine().run('DELETE FROM score_rules WHERE id = ?', [log.target_id]);
        } else if (log.action === 'UPDATE' && log.target_id !== null && previousState) {
          this.engine().run('UPDATE score_rules SET type = ?, name = ?, score_value = ?, class_score_value = ? WHERE id = ?', [
            String(previousState.type ?? ''),
            String(previousState.name ?? ''),
            Number(previousState.score_value ?? 0),
            Number(previousState.class_score_value ?? 0),
            log.target_id,
          ]);
        } else if (log.action === 'DELETE' && log.target_id !== null && previousState) {
          this.engine().run('INSERT INTO score_rules (id, type, name, score_value, class_score_value, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
            log.target_id,
            String(previousState.type ?? ''),
            String(previousState.name ?? ''),
            Number(previousState.score_value ?? 0),
            Number(previousState.class_score_value ?? 0),
            nowIso(),
          ]);
        } else {
          return false;
        }
        break;

      case 'user':
        if (log.action === 'CREATE' && log.target_id !== null && newState) {
          this.engine().run('DELETE FROM users WHERE id = ?', [log.target_id]);
        } else if (log.action === 'UPDATE' && log.target_id !== null && previousState) {
          this.engine().run('UPDATE users SET username = ?, role = ? WHERE id = ?', [
            String(previousState.username ?? ''),
            String(previousState.role ?? ''),
            log.target_id,
          ]);
        } else if (log.action === 'DELETE' && log.target_id !== null && previousState) {
          this.engine().run('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', [
            log.target_id,
            String(previousState.username ?? ''),
            String(previousState.password_hash ?? hashPassword('1234')),
            String(previousState.role ?? 'OFFICER'),
            nowIso(),
          ]);
        } else {
          return false;
        }
        break;

      case 'score_record':
        if (log.action === 'CREATE' && log.target_id !== null) {
          this.engine().run('UPDATE score_records SET is_revoked = 1, revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ?', [nowIso(), operatorId, '回滚操作', log.target_id]);
          await this.recalculateStudentScores();
        }
        break;

      case 'class_info':
        if (previousState) {
          this.engine().run('UPDATE class_info SET class_name = ?, initial_class_score = ? WHERE id = 1', [
            String(previousState.class_name ?? ''),
            Number(previousState.initial_class_score ?? 0),
          ]);
          await this.recalculateClassScore();
        } else {
          return false;
        }
        break;

      case 'settings':
        if (previousState) {
          this.engine().run('INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)', [
            log.target_id !== null ? String(log.target_id) : log.details ?? '',
            JSON.stringify(previousState),
            nowIso(),
          ]);
        } else {
          return false;
        }
        break;

      default:
        return false;
    }

    await this.logOperation(operatorId, 'ROLLBACK', log.target_type, log.target_id ?? undefined, `回滚操作 #${logId}`);
    return true;
  }

  async cancelRollback(logId: number, operatorId: number): Promise<boolean> {
    const log = await this.getOperationLogById(logId);
    if (!log || log.action !== 'ROLLBACK') {
      return false;
    }

    // 从 details 字段解析被回滚的原始操作记录ID
    // details 格式: "回滚操作 #{originalLogId}"
    const match = log.details?.match(/回滚操作 #(\d+)/);
    if (!match) {
      return false;
    }
    const targetLogId = Number(match[1]);
    if (!targetLogId) {
      return false;
    }

    const targetLog = await this.getOperationLogById(targetLogId);
    if (!targetLog) {
      return false;
    }

    // 根据目标操作类型执行恢复
    switch (targetLog.target_type) {
      case 'student': {
        if (targetLog.action === 'CREATE' && targetLog.new_state) {
          // 恢复创建操作：重新创建学生
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('INSERT INTO students (id, student_no, name, initial_score, current_score, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
            targetLog.target_id ?? Date.now(),
            String(newState.student_no ?? ''),
            String(newState.name ?? ''),
            Number(newState.initial_score ?? 0),
            Number(newState.current_score ?? 0),
            nowIso(),
          ]);
        } else if (targetLog.action === 'DELETE' && targetLog.previous_state) {
          // 恢复删除操作：删除学生
          this.engine().run('DELETE FROM students WHERE id = ?', [targetLog.target_id]);
        } else if (targetLog.action === 'UPDATE' && targetLog.new_state && targetLog.previous_state) {
          // 恢复更新操作：恢复新状态
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('UPDATE students SET student_no = ?, name = ?, initial_score = ? WHERE id = ?', [
            String(newState.student_no ?? ''),
            String(newState.name ?? ''),
            Number(newState.initial_score ?? 0),
            targetLog.target_id,
          ]);
        }
        await this.recalculateStudentScores();
        break;
      }

      case 'rule': {
        if (targetLog.action === 'CREATE' && targetLog.new_state) {
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('INSERT INTO score_rules (id, type, name, score_value, class_score_value, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
            targetLog.target_id ?? Date.now(),
            String(newState.type ?? 'DEDUCT'),
            String(newState.name ?? ''),
            Number(newState.score_value ?? 0),
            Number(newState.class_score_value ?? 0),
            nowIso(),
          ]);
        } else if (targetLog.action === 'DELETE' && targetLog.previous_state) {
          this.engine().run('DELETE FROM score_rules WHERE id = ?', [targetLog.target_id]);
        } else if (targetLog.action === 'UPDATE' && targetLog.new_state && targetLog.previous_state) {
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('UPDATE score_rules SET type = ?, name = ?, score_value = ?, class_score_value = ? WHERE id = ?', [
            String(newState.type ?? ''),
            String(newState.name ?? ''),
            Number(newState.score_value ?? 0),
            Number(newState.class_score_value ?? 0),
            targetLog.target_id,
          ]);
        }
        break;
      }

      case 'user': {
        if (targetLog.action === 'CREATE' && targetLog.new_state) {
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', [
            targetLog.target_id ?? Date.now(),
            String(newState.username ?? ''),
            String(newState.password_hash ?? hashPassword('1234')),
            String(newState.role ?? 'OFFICER'),
            nowIso(),
          ]);
        } else if (targetLog.action === 'DELETE' && targetLog.previous_state) {
          this.engine().run('DELETE FROM users WHERE id = ?', [targetLog.target_id]);
        } else if (targetLog.action === 'UPDATE' && targetLog.new_state && targetLog.previous_state) {
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('UPDATE users SET username = ?, role = ? WHERE id = ?', [
            String(newState.username ?? ''),
            String(newState.role ?? ''),
            targetLog.target_id,
          ]);
        }
        break;
      }

      case 'score_record': {
        if (targetLog.action === 'CREATE' && targetLog.target_id !== null) {
          // 恢复评分记录：撤销撤销状态
          this.engine().run('UPDATE score_records SET is_revoked = 0, revoked_at = NULL, revoked_by = NULL, revoke_reason = NULL WHERE id = ?', [targetLog.target_id]);
          await this.recalculateStudentScores();
        }
        break;
      }

      case 'class_info': {
        if (targetLog.new_state && targetLog.previous_state) {
          const newState = targetLog.new_state as Record<string, unknown>;
          this.engine().run('UPDATE class_info SET class_name = ?, initial_class_score = ? WHERE id = 1', [
            String(newState.class_name ?? ''),
            Number(newState.initial_class_score ?? 0),
          ]);
          await this.recalculateClassScore();
        }
        break;
      }

      case 'settings': {
        if (targetLog.new_state && targetLog.previous_state) {
          this.engine().run('INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)', [
            targetLog.target_id !== null ? String(targetLog.target_id) : targetLog.details ?? '',
            JSON.stringify(targetLog.new_state),
            nowIso(),
          ]);
        }
        break;
      }

      default:
        return false;
    }

    // 记录取消回滚操作
    await this.logOperation(operatorId, 'CANCEL_ROLLBACK', log.target_type, log.target_id ?? undefined, `取消回滚操作 #${logId}`);
    return true;
  }

  async deleteOperationLog(logId: number): Promise<boolean> {
    try {
      this.engine().run('DELETE FROM operation_logs WHERE id = ?', [logId]);
      return true;
    } catch {
      return false;
    }
  }

  async deleteOperationLogs(logIds: number[]): Promise<boolean> {
    try {
      // 验证所有ID都是有效数字
      if (!logIds.every((id) => Number.isInteger(id) && id > 0)) {
        return false;
      }
      const placeholders = logIds.map(() => '?').join(',');
      this.engine().run('DELETE FROM operation_logs WHERE id IN (' + placeholders + ')', logIds);
      return true;
    } catch {
      return false;
    }
  }
}

export const repository = new AppRepository();

