import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { RecordsTabProps } from './types';

export function RecordsTab({ records, studentMap, userMap, canRevoke, canDelete, onRevoke, onDelete }: RecordsTabProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  return (
    <Card><CardContent>
      <Typography variant="h6" fontWeight={800}>流水明细（撤销保留痕迹）</Typography>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={1.5}>
        {records.map((record) => {
          const isConfirmingDelete = confirmingId === record.id;

          return (
            <Stack key={record.id} direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
              <Box>
                <Typography>
                  {record.student_id === 0 ? '班级总分' : `${studentMap[record.student_id] ?? `学生ID ${record.student_id}`}`} / {record.reason} / 变动 {record.change_value > 0 ? `+${record.change_value}` : record.change_value} 分
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  操作人：{userMap[record.operator_id] ?? `用户ID ${record.operator_id}`} · 创建于 {new Date(record.created_at).toLocaleString('zh-CN')} {record.is_revoked ? `· 已撤销：${record.revoke_reason ?? ''}` : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-end', md: 'flex-start' } }}>
                {record.is_revoked ? <Chip label="已撤销" /> : <Button variant="outlined" disabled={!canRevoke || isConfirmingDelete} onClick={() => onRevoke(record.id)}>撤销</Button>}
                <Box
                  sx={{
                    width: isConfirmingDelete ? 290 : 96,
                    minWidth: isConfirmingDelete ? 290 : 96,
                    height: 40,
                    border: '1px solid',
                    borderColor: 'error.main',
                    borderRadius: 2,
                    bgcolor: isConfirmingDelete ? 'error.50' : 'transparent',
                    color: 'error.main',
                    overflow: 'hidden',
                    transition: 'width 260ms cubic-bezier(0.22, 1, 0.36, 1), min-width 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms ease, box-shadow 220ms ease',
                    boxShadow: isConfirmingDelete ? '0 8px 24px rgba(211, 47, 47, 0.12)' : 'none',
                    transformOrigin: 'right center',
                  }}
                >
                  {isConfirmingDelete ? (
                    <Stack direction="row" alignItems="stretch" justifyContent="space-between" sx={{ width: '100%', height: '100%' }}>
                      <Button
                        color="inherit"
                        onClick={() => setConfirmingId(null)}
                        sx={{ minWidth: 72, borderRadius: 0, borderRight: '1px solid', borderColor: 'rgba(211, 47, 47, 0.24)' }}
                      >
                        取消
                      </Button>
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1.5 }}>
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          确定删除吗？
                        </Typography>
                      </Box>
                      <Button
                        color="error"
                        onClick={() => {
                          onDelete(record.id);
                          setConfirmingId(null);
                        }}
                        sx={{ minWidth: 88, borderRadius: 0, borderLeft: '1px solid', borderColor: 'rgba(211, 47, 47, 0.24)', fontWeight: 700 }}
                      >
                        删除
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      color="error"
                      variant="text"
                      disabled={!canDelete}
                      onClick={() => setConfirmingId(record.id)}
                      sx={{ width: '100%', height: '100%', minWidth: 0, borderRadius: 0, fontWeight: 700 }}
                    >
                      删除
                    </Button>
                  )}
                </Box>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </CardContent></Card>
  );
}
