import { Button, Card, CardContent, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { RulesTabProps } from './types';

export function RulesTab({ ruleForm, filteredRules, onRuleFormChange, onSubmit, onReset, onDelete }: RulesTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card><CardContent><Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>{ruleForm.id ? '编辑规则' : '添加规则'}</Typography>
          <TextField select label="类型" value={ruleForm.type} onChange={(e) => onRuleFormChange((prev) => ({ ...prev, type: e.target.value as typeof prev.type }))}>
            <MenuItem value="ADD">加分</MenuItem>
            <MenuItem value="DEDUCT">扣分</MenuItem>
          </TextField>
          <TextField label="规则名称" value={ruleForm.name} onChange={(e) => onRuleFormChange((prev) => ({ ...prev, name: e.target.value }))} />
          <TextField label="默认分值" type="number" value={ruleForm.score_value} onChange={(e) => onRuleFormChange((prev) => ({ ...prev, score_value: Number(e.target.value) }))} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onSubmit}>保存规则</Button>
            {ruleForm.id ? <Button onClick={onReset}>取消编辑</Button> : null}
          </Stack>
        </Stack></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card><CardContent>
          <Typography variant="h6" fontWeight={800}>规则列表</Typography>
          <Table>
            <TableHead><TableRow><TableCell>名称</TableCell><TableCell>类型</TableCell><TableCell>分值</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id} hover>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{rule.type === 'ADD' ? '加分' : '扣分'}</TableCell>
                  <TableCell>{rule.type === 'ADD' ? '+' : '-'}{rule.score_value}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton onClick={() => onRuleFormChange(rule)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => onDelete(rule.id)}><DeleteIcon /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </Grid>
    </Grid>
  );
}
