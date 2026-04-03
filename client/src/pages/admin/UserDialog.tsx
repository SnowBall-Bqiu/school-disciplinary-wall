import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import type { UserDialogProps } from './types';

export function UserDialog({ open, userForm, canEditRole, onClose, onUserFormChange, onSave }: UserDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{userForm.id ? '编辑系统用户' : '创建系统用户'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="用户名" value={userForm.username} onChange={(e) => onUserFormChange((prev) => ({ ...prev, username: e.target.value }))} />
          <TextField label={userForm.id ? '新密码（留空则不改）' : '密码'} type="password" value={userForm.password} onChange={(e) => onUserFormChange((prev) => ({ ...prev, password: e.target.value }))} />
          <TextField select label="角色" value={userForm.role} onChange={(e) => onUserFormChange((prev) => ({ ...prev, role: e.target.value as typeof prev.role }))} disabled={!canEditRole}>
            <MenuItem value="OFFICER">班干部</MenuItem>
            <MenuItem value="TEACHER">老师</MenuItem>
            <MenuItem value="SUPER_ADMIN">超级管理员</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
