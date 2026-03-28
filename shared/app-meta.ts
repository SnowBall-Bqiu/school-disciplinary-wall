export const appMeta = {
  appName: '班级违纪登记与德育分管理系统',
  storageModes: ['sqlite', 'sqljs'] as const,
};

export type StorageMode = (typeof appMeta.storageModes)[number];
