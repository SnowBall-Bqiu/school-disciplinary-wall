import { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { OperationLogEntity } from '@shared/types';


const actionLabels: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  ROLLBACK: '回滚',
  CANCEL_ROLLBACK: '取消回滚',
  APPLY_SCORE: '加扣分',
  ADJUST_CLASS_SCORE: '调整班级总分',
  IMPORT: '导入',
  EXPORT: '导出',
  RESET: '重置',
};

const targetTypeLabels: Record<string, string> = {
  student: '学生',
  rule: '规则',
  user: '用户',
  score_record: '评分记录',
  class_info: '班级信息',
  settings: '系统设置',
  system: '系统',
};

const rollbackableActions = ['CREATE', 'UPDATE', 'DELETE', 'ROLLBACK', 'CANCEL_ROLLBACK'];

// 判断是否为可回滚操作
const isRollbackable = (action: string, log: OperationLogEntity): boolean => {
  if (!rollbackableActions.includes(action)) return false;
  if (action === 'ROLLBACK') {
    // 回滚操作可以取消回滚（恢复原状）- 只要有target_id就认为可以取消回滚
    return log.target_id !== null;
  }
  if (action === 'CANCEL_ROLLBACK') {
    // 取消回滚操作不能再回滚
    return false;
  }
  return true;
};

// 判断是否可以取消回滚（只对回滚操作有效）
const isCancellableRollback = (action: string, log: OperationLogEntity): boolean => {
  return action === 'ROLLBACK' && log.previous_state !== null;
};

interface LogsTabPropsInternal {
  logs: OperationLogEntity[];
  userMap: Record<number, string>;
  onRollback: (id: number) => void;
  onCancelRollback?: (id: number) => void;
  onDeleteLog?: (id: number) => void;
  onDeleteLogs?: (ids: number[]) => void;
  canRollback: boolean;
  canDeleteLog?: boolean;
}

export function LogsTab({ logs, userMap, onRollback, onCancelRollback, onDeleteLog, onDeleteLogs, canRollback, canDeleteLog = false }: LogsTabPropsInternal) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{ title: string; content: string; onConfirm: () => void; confirmText: string; confirmColor: 'warning' | 'error' }>({ title: '', content: '', onConfirm: () => {}, confirmText: '确认', confirmColor: 'warning' });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const rollbackableMap = useMemo(() => {
    return Object.fromEntries(
      logs.map((log) => {
        const canRollbackThis = canRollback && isRollbackable(log.action, log);
        return [log.id, canRollbackThis];
      }),
    ) as Record<number, boolean>;
  }, [canRollback, logs]);

  // 批量选择相关
  const allSelected = logs.length > 0 && logs.every((log) => selectedIds.has(log.id));
  const someSelected = logs.some((log) => selectedIds.has(log.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((log) => log.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0 || !onDeleteLogs) return;
    handleOpenDialog({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedIds.size} 条操作记录吗？此操作不可恢复。`,
      onConfirm: () => {
        onDeleteLogs(Array.from(selectedIds));
        setSelectedIds(new Set());
      },
      confirmText: '批量删除',
      confirmColor: 'error',
    });
  };

  const handleOpenDialog = (config: { title: string; content: string; onConfirm: () => void; confirmText: string; confirmColor: 'warning' | 'error' }) => {
    setDialogConfig(config);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmDialog = () => {
    dialogConfig.onConfirm();
    setDialogOpen(false);
  };

  return (
    <Card><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={800}>操作日志</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {selectedIds.size > 0 && canDeleteLog && onDeleteLogs && (
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleBatchDelete}
            >
              批量删除 ({selectedIds.size})
            </Button>
          )}
          <Typography variant="body2" color="text.secondary">共 {logs.length} 条记录</Typography>
        </Stack>
      </Stack>

      {/* 确认对话框 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogConfig.content}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleConfirmDialog} color={dialogConfig.confirmColor} variant="contained" autoFocus>
            {dialogConfig.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      <Table size="small">
        <TableHead>
          <TableRow>
            {canDeleteLog && onDeleteLogs && (
              <TableCell padding="checkbox" width={50}>
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': '全选' }}
                />
              </TableCell>
            )}
            <TableCell width={60}>ID</TableCell>
            <TableCell width={80}>操作类型</TableCell>
            <TableCell width={80}>操作对象</TableCell>
            <TableCell>详情</TableCell>
            <TableCell width={100}>操作人</TableCell>
            <TableCell width={150}>操作时间</TableCell>
            <TableCell width={260} align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>暂无操作记录</Typography>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const canRollbackThis = rollbackableMap[log.id];
              // 判断是否有可恢复的状态
              const hasStateToRestore = (() => {
                if (log.action === 'ROLLBACK') {
                  // ROLLBACK 操作：检查是否有 target_id（指向被回滚的记录）
                  return log.target_id !== null;
                } else if (log.action === 'CREATE') {
                  // CREATE 操作：检查 target_id 是否存在（对象是否还存在）
                  return log.target_id !== null;
                } else {
                  // UPDATE/DELETE 操作：检查是否有 previous_state
                  return !!log.previous_state;
                }
              })();
              const isConfirming = confirmingId === log.id;
              const isCancelling = cancellingId === log.id;
              const isDeleting = deletingId === log.id;

              // 是否可以取消回滚
              const showCancelRollback = onCancelRollback && isCancellableRollback(log.action, log);
              // 是否可以删除记录
              const showDelete = canDeleteLog && onDeleteLog;

              const isSelected = selectedIds.has(log.id);

              return (
                <TableRow key={log.id} hover selected={isSelected}>
                  {canDeleteLog && onDeleteLogs && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(log.id)}
                        inputProps={{ 'aria-label': `选择记录 ${log.id}` }}
                      />
                    </TableCell>
                  )}
                  <TableCell>{log.id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={actionLabels[log.action] ?? log.action}
                      color={
                        log.action === 'DELETE'
                          ? 'error'
                          : log.action === 'CREATE'
                            ? 'success'
                            : log.action === 'ROLLBACK' || log.action === 'CANCEL_ROLLBACK'
                              ? 'warning'
                              : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{targetTypeLabels[log.target_type] ?? log.target_type}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{userMap[log.operator_id] ?? `ID:${log.operator_id}`}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      {/* 回滚/取消回滚按钮 */}
                      {canRollbackThis && (
                        <Tooltip title={!hasStateToRestore ? '该操作无法回滚' : isConfirming || isCancelling ? '' : '撤销此操作'} disableHoverListener={isConfirming || isCancelling}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: isConfirming || isCancelling ? 'warning.main' : 'transparent',
                              bgcolor: isConfirming || isCancelling ? 'warning.50' : 'transparent',
                              borderRadius: 999,
                              px: isConfirming || isCancelling ? 0.5 : 0,
                              py: isConfirming || isCancelling ? 0.5 : 0,
                              gap: isConfirming || isCancelling ? 0.75 : 0,
                              minWidth: isConfirming || isCancelling ? 260 : 0,
                              maxWidth: isConfirming || isCancelling ? 260 : 120,
                              transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            <Button
                              size="small"
                              color="warning"
                              startIcon={!isConfirming && !isCancelling ? <UndoIcon /> : undefined}
                              onClick={() => {
                                if (!hasStateToRestore) return;
                                if (!isConfirming && !isCancelling) {
                                  if (showCancelRollback && onCancelRollback) {
                                    setCancellingId(log.id);
                                  } else {
                                    setConfirmingId(log.id);
                                  }
                                  return;
                                }
                                if (isConfirming) {
                                  onRollback(log.id);
                                  setConfirmingId(null);
                                } else if (isCancelling && onCancelRollback) {
                                  onCancelRollback(log.id);
                                  setCancellingId(null);
                                }
                              }}
                              disabled={!hasStateToRestore}
                              sx={{
                                minWidth: isConfirming || isCancelling ? 100 : 72,
                                borderRadius: 999,
                                transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
                                flexShrink: 0,
                              }}
                            >
                              {isConfirming ? '确认回滚' : isCancelling ? '确认取消' : showCancelRollback ? '取消回滚' : '回滚'}
                            </Button>

                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                width: isConfirming || isCancelling ? 'auto' : 0,
                                opacity: isConfirming || isCancelling ? 1 : 0,
                                transform: isConfirming || isCancelling ? 'translateX(0)' : 'translateX(8px)',
                                pointerEvents: isConfirming || isCancelling ? 'auto' : 'none',
                                whiteSpace: 'nowrap',
                                transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
                                overflow: 'hidden',
                              }}
                            >
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() => {
                                  setConfirmingId(null);
                                  setCancellingId(null);
                                }}
                                sx={{ minWidth: 32, width: 32, height: 32, borderRadius: '50%', p: 0, flexShrink: 0 }}
                              >
                                <CloseIcon fontSize="small" />
                              </Button>
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                {isConfirming ? '此操作将恢复到变更前' : isCancelling ? '此操作将恢复回滚前的状态' : ''}
                              </Typography>
                              <CheckIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                            </Box>
                          </Box>
                        </Tooltip>
                      )}

                      {/* 删除记录按钮 */}
                      {showDelete && (
                        <Tooltip title="删除此记录">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              handleOpenDialog({
                                title: '删除确认',
                                content: `确定要删除这条操作记录吗？此操作不可恢复。`,
                                onConfirm: () => {
                                  if (onDeleteLog) {
                                    onDeleteLog(log.id);
                                  }
                                },
                                confirmText: '删除',
                                confirmColor: 'error',
                              });
                            }}
                            sx={{
                              width: 32,
                              height: 32,
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

