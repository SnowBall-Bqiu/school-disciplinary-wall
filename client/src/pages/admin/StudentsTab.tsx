import { Box, Button, Card, CardContent, Collapse, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import type { StudentsTabProps } from './types';

export function StudentsTab({ studentForm, filteredStudents, canDeleteStudents, onStudentFormChange, onSubmit, onReset, onDelete }: StudentsTabProps) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  function handleDeleteClick(id: number) {
    setConfirmId(id);
  }

  function handleCancel() {
    setConfirmId(null);
  }

  function handleConfirm(id: number) {
    setConfirmId(null);
    onDelete(id);
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card><CardContent><Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>{studentForm.id ? '编辑学生' : '添加学生'}</Typography>
          <TextField label="学号" value={studentForm.student_no} onChange={(e) => onStudentFormChange((prev) => ({ ...prev, student_no: e.target.value }))} />
          <TextField label="姓名" value={studentForm.name} onChange={(e) => onStudentFormChange((prev) => ({ ...prev, name: e.target.value }))} />
          <TextField label="初始德育分" type="number" value={studentForm.initial_score} onChange={(e) => onStudentFormChange((prev) => ({ ...prev, initial_score: Number(e.target.value) }))} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onSubmit}>保存学生</Button>
            {studentForm.id ? <Button onClick={onReset}>取消编辑</Button> : null}
          </Stack>
        </Stack></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card><CardContent>
          <Typography variant="h6" fontWeight={800}>学生列表</Typography>
          <Box sx={{ maxHeight: 500, overflowY: 'auto', mt: 2 }}>
          <Table stickyHeader>
            <TableHead><TableRow><TableCell>ID</TableCell><TableCell>学号</TableCell><TableCell>姓名</TableCell><TableCell>初始分</TableCell><TableCell>当前分</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>{student.id}</TableCell>
                  <TableCell>{student.student_no}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.initial_score}</TableCell>
                  <TableCell>{student.current_score}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      <IconButton onClick={() => { handleCancel(); onStudentFormChange(student); }}><EditIcon /></IconButton>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <Box
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1,
                            overflow: 'hidden',
                            borderRadius: confirmId === student.id ? 2 : '50%',
                            width: confirmId === student.id ? 220 : 40,
                            height: 40,
                            transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), border-radius 0.35s cubic-bezier(0.4,0,0.2,1)',
                            bgcolor: 'error.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Collapse in={confirmId === student.id} orientation="horizontal" timeout={300}>
                            <Stack direction="row" alignItems="center" sx={{ pl: 1.5, pr: 0.5, whiteSpace: 'nowrap', minWidth: 180 }}>
                              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, flex: 1 }}>确定删除吗？</Typography>
                              <Button
                                size="small"
                                sx={{ color: 'white', minWidth: 0, px: 1, opacity: 0.85, '&:hover': { opacity: 1 } }}
                                onClick={handleCancel}
                              >取消</Button>
                              <Button
                                size="small"
                                sx={{ color: 'white', fontWeight: 700, minWidth: 0, px: 1 }}
                                onClick={() => handleConfirm(student.id)}
                              >删除</Button>
                            </Stack>
                          </Collapse>
                          <Box
                            sx={{
                              minWidth: 40,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: canDeleteStudents ? 'pointer' : 'not-allowed',
                              opacity: canDeleteStudents ? 1 : 0.4,
                            }}
                            onClick={() => canDeleteStudents && handleDeleteClick(student.id)}
                          >
                            <DeleteIcon sx={{ color: 'white', fontSize: 20 }} />
                          </Box>
                        </Box>
                        <Box sx={{ width: 40, height: 40, visibility: 'hidden' }} />
                      </Box>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        </CardContent></Card>
      </Grid>
    </Grid>
  );
}
