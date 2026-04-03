import { Card, CardContent, Divider, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { roleLabels } from './constants';
import type { UsersTabProps } from './types';

export function UsersTab({ filteredUsers, currentRole, currentUserId, onEdit, onDelete }: UsersTabProps) {
  return (
    <Card><CardContent>
      <Typography variant="h6" fontWeight={800}>用户管理</Typography>
      <Divider sx={{ my: 2 }} />
      <Table>
        <TableHead><TableRow><TableCell>用户名</TableCell><TableCell>角色</TableCell><TableCell>创建时间</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
        <TableBody>
          {filteredUsers.map((user) => {
            const canOperate = currentRole === 'SUPER_ADMIN' || (currentRole === 'TEACHER' && user.role === 'OFFICER');
            return (
              <TableRow key={user.id} hover>
                <TableCell>{user.username}</TableCell>
                <TableCell>{roleLabels[user.role]}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton disabled={!canOperate} onClick={() => onEdit(user.id)}><EditIcon /></IconButton>
                    <IconButton color="error" disabled={!canOperate || user.id === currentUserId} onClick={() => onDelete(user.id)}><DeleteIcon /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
