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
      'CREATE TABLE IF NOT EXISTS score_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, name TEXT NOT NULL, score_value INTEGER NOT NULL, created_at TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS score_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, rule_id INTEGER, operator_id INTEGER NOT NULL, change_value INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, batch_id TEXT, is_revoked INTEGER NOT NULL DEFAULT 0, revoked_at TEXT, revoked_by INTEGER, revoke_reason TEXT)',
      'CREATE TABLE IF NOT EXISTS class_info (id INTEGER PRIMARY KEY CHECK (id = 1), class_name TEXT NOT NULL, initial_class_score INTEGER NOT NULL, current_class_score INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TEXT NOT NULL)',
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

  async getDashboardSettings() {
    const row = this.engine().get<SettingRow>('SELECT * FROM system_settings WHERE setting_key = ?', ['dashboard_settings']);
    return row ? (JSON.parse(row.setting_value) as DashboardSettings) : defaultDashboardSettings;
  }

  async saveDashboardSettings(settings: DashboardSettings) {
    await this.upsertSetting('dashboard_settings', JSON.stringify(settings));
    return settings;
  }

  async createUser(payload: CreateUserPayload) {
    this.engine().run('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)', [payload.username, hashPassword(payload.password), payload.role, nowIso()]);
    return this.getSummary();
  }

  async updateUser(id: number, payload: UpdateUserPayload) {
    const current = this.engine().get<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    if (!current) {
      throw new Error('用户不存在。');
    }
    const passwordHash = payload.password ? hashPassword(payload.password) : current.password_hash;
    this.engine().run('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?', [payload.username, payload.role, passwordHash, id]);
    return this.getSummary();
  }

  async deleteUser(id: number) {
    this.engine().run('DELETE FROM users WHERE id = ?', [id]);
    return this.getSummary();
  }

  async createStudent(payload: StudentPayload) {
    this.engine().run('INSERT INTO students (student_no, name, initial_score, current_score, created_at) VALUES (?, ?, ?, ?, ?)', [payload.student_no, payload.name, payload.initial_score, payload.initial_score, nowIso()]);
    return this.recalculateClassScore();
  }

  async updateStudent(id: number, payload: StudentPayload) {
    this.engine().run('UPDATE students SET student_no = ?, name = ?, initial_score = ? WHERE id = ?', [payload.student_no, payload.name, payload.initial_score, id]);
    return this.recalculateStudentScores();
  }

  async deleteStudent(id: number) {
    this.engine().run('DELETE FROM score_records WHERE student_id = ?', [id]);
    this.engine().run('DELETE FROM students WHERE id = ?', [id]);
    return this.recalculateClassScore();
  }

  async saveRule(payload: ScoreRulePayload, id?: number) {
    if (id) {
      this.engine().run('UPDATE score_rules SET type = ?, name = ?, score_value = ? WHERE id = ?', [payload.type, payload.name, payload.score_value, id]);
    } else {
      this.engine().run('INSERT INTO score_rules (type, name, score_value, created_at) VALUES (?, ?, ?, ?)', [payload.type, payload.name, payload.score_value, nowIso()]);
    }
    return this.getSummary();
  }

  async deleteRule(id: number) {
    this.engine().run('DELETE FROM score_rules WHERE id = ?', [id]);
    return this.getSummary();
  }

  async applyScoreAction(payload: ScoreActionPayload, operatorId: number) {
    const batchId = randomId('batch');
    for (const studentId of payload.studentIds) {
      this.engine().run('INSERT INTO score_records (student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [studentId, payload.ruleId ?? null, operatorId, payload.changeValue, payload.reason, nowIso(), batchId]);
    }
    return this.recalculateStudentScores();
  }

  async adjustClassScore(changeValue: number, operatorId: number, reason: string) {
    this.engine().run('INSERT INTO score_records (student_id, rule_id, operator_id, change_value, reason, created_at, batch_id, is_revoked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [0, null, operatorId, changeValue, reason, nowIso(), randomId('class')]);
    return this.recalculateClassScore();
  }

  async revokeScoreRecord(id: number, revokedBy: number, revokeReason: string) {
    this.engine().run('UPDATE score_records SET is_revoked = 1, revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE id = ?', [nowIso(), revokedBy, revokeReason, id]);
    return this.recalculateStudentScores();
  }

  async updateClassInfo(payload: { class_name: string; initial_class_score: number }) {
    this.engine().run('UPDATE class_info SET class_name = ?, initial_class_score = ? WHERE id = 1', [payload.class_name, payload.initial_class_score]);
    return this.recalculateClassScore();
  }

  async resetAll() {
    this.engine().run('DELETE FROM students');
    this.engine().run('DELETE FROM score_rules');
    this.engine().run('DELETE FROM score_records');
    await this.upsertSetting('dashboard_settings', JSON.stringify(defaultDashboardSettings));
    return this.recalculateClassScore();
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


  async importData(payload: ExportPayload) {
    const db = this.engine();
    for (const table of ['score_records', 'score_rules', 'students', 'users', 'class_info', 'system_settings']) {
      db.run(`DELETE FROM ${table}`);
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
      db.run('INSERT INTO score_rules (id, type, name, score_value, created_at) VALUES (?, ?, ?, ?, ?)', [rule.id, rule.type, rule.name, rule.score_value, rule.created_at]);
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
      const total = this.engine().get<{ total: number }>('SELECT COALESCE(SUM(change_value), 0) as total FROM score_records WHERE is_revoked = 0');
      const currentClassScore = classInfo.initial_class_score + Number(total?.total ?? 0);
      this.engine().run('UPDATE class_info SET current_class_score = ? WHERE id = 1', [currentClassScore]);
    }
    return this.getSummary();
  }
}

export const repository = new AppRepository();
