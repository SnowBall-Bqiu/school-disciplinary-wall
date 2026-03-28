import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export const initSchema = z.object({
  className: z.string().min(1, '请输入班级名称'),
  initialClassScore: z.number().int(),
  defaultStudentScore: z.number().int(),
  storageMode: z.enum(['sqlite', 'sqljs']),
  username: z.string().min(3),
  password: z.string().min(4),
});

export const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  role: z.enum(['SUPER_ADMIN', 'TEACHER', 'OFFICER']),
});

export const updateUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4).optional(),
  role: z.enum(['SUPER_ADMIN', 'TEACHER', 'OFFICER']),
});

export const studentSchema = z.object({
  student_no: z.string().min(1),
  name: z.string().min(1),
  initial_score: z.number().int(),
});

export const ruleSchema = z.object({
  type: z.enum(['ADD', 'DEDUCT']),
  name: z.string().min(1),
  score_value: z.number().int().positive(),
});

export const scoreActionSchema = z.object({
  studentIds: z.array(z.number().int()).min(1),
  ruleId: z.number().int().nullable().optional(),
  reason: z.string().min(1),
  changeValue: z.number().int(),
});

export const dashboardSettingsSchema = z.object({
  backgroundType: z.enum(['image', 'video', 'gradient']),
  backgroundValue: z.string(),
  overlayOpacity: z.number().min(0).max(1),
  modules: z.object({
    weather: z.boolean(),
    quote: z.boolean(),
    ranking: z.boolean(),
    bulletin: z.boolean(),
    classScore: z.boolean(),
    dateTime: z.boolean(),
  }),

  layout: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    }),
  ),
  rankingSize: z.number().int().min(3).max(20),
  reminderSize: z.number().int().min(1).max(10),
});


export const importSchema = z.object({
  classInfo: z.object({
    id: z.number().int(),
    class_name: z.string(),
    initial_class_score: z.number().int(),
    current_class_score: z.number().int(),
  }).nullable(),
  users: z.array(z.object({
    id: z.number().int().optional(),
    username: z.string(),
    role: z.enum(['SUPER_ADMIN', 'TEACHER', 'OFFICER']),
    created_at: z.string(),
    password_hash: z.string().optional(),
  })),
  students: z.array(z.object({
    id: z.number().int(),
    student_no: z.string(),
    name: z.string(),
    initial_score: z.number().int(),
    current_score: z.number().int(),
    created_at: z.string(),
  })),
  scoreRules: z.array(z.object({
    id: z.number().int(),
    type: z.enum(['ADD', 'DEDUCT']),
    name: z.string(),
    score_value: z.number().int(),
    created_at: z.string(),
  })),
  scoreRecords: z.array(z.object({
    id: z.number().int(),
    student_id: z.number().int(),
    rule_id: z.number().int().nullable(),
    operator_id: z.number().int(),
    change_value: z.number().int(),
    reason: z.string(),
    created_at: z.string(),
    batch_id: z.string().nullable(),
    is_revoked: z.number().int(),
    revoked_at: z.string().nullable(),
    revoked_by: z.number().int().nullable(),
    revoke_reason: z.string().nullable(),
  })),
  settings: z.record(z.string()),
  storageMode: z.enum(['sqlite', 'sqljs']),
});
