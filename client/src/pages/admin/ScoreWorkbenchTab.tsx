import { Autocomplete, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import type { ScoreWorkbenchTabProps } from './types';

interface StudentOption {
  id: number;
  name: string;
  student_no: string;
  current_score: number;
  initial_score: number;
}

export function ScoreWorkbenchTab({ summary, scoreForm, onScoreFormChange, onSubmit }: ScoreWorkbenchTabProps) {
  const studentOptions: StudentOption[] = summary?.students ?? [];

  // 获取已选中的学生对象
  const selectedStudents = studentOptions.filter((s) => scoreForm.studentIds.includes(s.id));

  // 处理学生选择变化
  const handleStudentChange = (_event: React.SyntheticEvent, newValue: StudentOption[]) => {
    onScoreFormChange((prev) => ({ ...prev, studentIds: newValue.map((s) => s.id) }));
  };

  // 从速览快速添加学生
  const handleQuickAdd = (student: StudentOption) => {
    if (!scoreForm.studentIds.includes(student.id)) {
      onScoreFormChange((prev) => ({ ...prev, studentIds: [...prev.studentIds, student.id] }));
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card><CardContent><Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>执行加扣分</Typography>

          {/* 学生多选搜索 */}
          <Autocomplete
            multiple
            options={studentOptions}
            value={selectedStudents}
            onChange={handleStudentChange}
            getOptionLabel={(option) => `${option.name} (${option.student_no})`}
            getOptionKey={(option) => option.id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, state) => {
              const input = state.inputValue.toLowerCase();
              return options.filter((o) =>
                o.name.toLowerCase().includes(input) ||
                o.student_no.toLowerCase().includes(input)
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="搜索并选择学生" placeholder="输入姓名或学号搜索" />
            )}
            renderTags={(value, getTagProps) => {
              return value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    {...tagProps}
                    key={option.id}
                    variant="outlined"
                    label={option.name}
                    size="small"
                  />
                );
              });
            }}
            noOptionsText="未找到匹配的学生"
            loadingText="加载中..."
          />

          {/* 已选学生数量提示 */}
          {scoreForm.studentIds.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              已选择 {scoreForm.studentIds.length} 名学生
            </Typography>
          )}

          <TextField select label="引用规则" value={scoreForm.ruleId} onChange={(e) => {
            const selected = summary?.scoreRules.find((item) => String(item.id) === e.target.value);
            onScoreFormChange((prev) => ({ ...prev, ruleId: e.target.value, reason: selected?.name ?? prev.reason, changeValue: selected ? (selected.type === 'ADD' ? selected.score_value : -selected.score_value) : prev.changeValue }));
          }}>
            <MenuItem value="">手动填写</MenuItem>
            {(summary?.scoreRules ?? []).map((rule) => <MenuItem key={rule.id} value={String(rule.id)}>{rule.name}（{rule.type === 'ADD' ? '+' : '-'}{rule.score_value}）</MenuItem>)}
          </TextField>
          <TextField label="备注原因" value={scoreForm.reason} onChange={(e) => onScoreFormChange((prev) => ({ ...prev, reason: e.target.value }))} />
          <TextField label="实际分值" type="number" value={scoreForm.changeValue} onChange={(e) => onScoreFormChange((prev) => ({ ...prev, changeValue: Number(e.target.value) }))} />
          <Button variant="contained" onClick={onSubmit} disabled={scoreForm.studentIds.length === 0}>确认执行</Button>
        </Stack></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card><CardContent><Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={800}>学生速览（点击快速添加）</Typography>
          <Box
            sx={{
              maxHeight: 420,
              overflowY: 'auto',
              pr: 1,
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                width: 10,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'action.hover',
                borderRadius: 999,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(25, 118, 210, 0.35)',
                borderRadius: 999,
                border: '2px solid transparent',
                backgroundClip: 'content-box',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.55)',
              },
            }}
          >
            <Stack spacing={1.2}>
              {(summary?.students ?? []).map((student) => (
                <Stack
                  key={student.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    py: 0.25,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    ...(scoreForm.studentIds.includes(student.id) && { bgcolor: 'action.selected' }),
                  }}
                  onClick={() => handleQuickAdd(student)}
                >
                  <Typography>ID {student.id} · {student.name} · {student.student_no}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {scoreForm.studentIds.includes(student.id) && (
                      <Chip size="small" color="primary" label="已选" />
                    )}
                    <Chip label={`${student.current_score} 分`} color={student.current_score >= student.initial_score ? 'success' : 'warning'} />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack></CardContent></Card>
      </Grid>
    </Grid>
  );
}

