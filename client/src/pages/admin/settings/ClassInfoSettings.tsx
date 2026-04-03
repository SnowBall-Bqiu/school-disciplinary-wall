import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface ClassInfoSettingsProps {
  classInfo: { class_name: string; initial_class_score: number; current_class_score: number } | null;
  canManageSystem: boolean;
  onUpdateClassInfo: (className: string, initialClassScore: number) => Promise<void>;
}

export function ClassInfoSettings({ classInfo, canManageSystem, onUpdateClassInfo }: ClassInfoSettingsProps) {
  const [className, setClassName] = useState(classInfo?.class_name ?? '');
  const [initialClassScore, setInitialClassScore] = useState(classInfo?.initial_class_score ?? 0);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // Sync local state when classInfo changes
  const [lastClassInfoId, setLastClassInfoId] = useState(classInfo?.class_name);
  if (classInfo && classInfo.class_name !== lastClassInfoId) {
    setClassName(classInfo.class_name);
    setInitialClassScore(classInfo.initial_class_score);
    setLastClassInfoId(classInfo.class_name);
  }

  const validate = (): boolean => {
    if (!className.trim()) {
      setError('班级名称不能为空');
      return false;
    }
    if (initialClassScore < 0) {
      setError('初始班级总分不能为负数');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
      return;
    }
    setSaveState('saving');
    try {
      await onUpdateClassInfo(className.trim(), initialClassScore);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>班级信息设置</Typography>
          <TextField
            label="班级名称"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={!canManageSystem || saveState === 'saving'}
            fullWidth
            required
            error={saveState === 'error' && !className.trim()}
            helperText={saveState === 'error' && !className.trim() ? '班级名称不能为空' : ''}
          />
          <TextField
            label="初始班级总分"
            type="number"
            value={initialClassScore}
            onChange={(e) => setInitialClassScore(Number(e.target.value))}
            disabled={!canManageSystem || saveState === 'saving'}
            fullWidth
            required
            error={initialClassScore < 0}
            helperText={initialClassScore < 0 ? '初始班级总分不能为负数' : ''}
          />
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              当前班级总分：{classInfo?.current_class_score ?? '--'}
            </Typography>
          </Box>
          <Collapse in={saveState === 'error' && error !== ''}>
            <Box sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon fontSize="small" />
              <Typography variant="body2">{error}</Typography>
            </Box>
          </Collapse>
          <Button
            startIcon={
              saveState === 'saving' ? (
                <CircularProgress size={16} />
              ) : saveState === 'success' ? (
                <CheckCircleIcon />
              ) : (
                <SaveIcon />
              )
            }
            variant="contained"
            onClick={handleSave}
            disabled={!canManageSystem || saveState === 'saving' || className.trim() === '' || initialClassScore < 0}
            color={saveState === 'success' ? 'success' : saveState === 'error' ? 'error' : 'primary'}
          >
            {saveState === 'saving' ? '保存中...' : saveState === 'success' ? '保存成功' : saveState === 'error' ? '保存失败' : '保存班级信息'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
