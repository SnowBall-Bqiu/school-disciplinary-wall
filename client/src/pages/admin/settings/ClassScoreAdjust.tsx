import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Collapse, Slider, Stack, TextField, Typography } from '@mui/material';

interface ClassScoreAdjustProps {
  classScoreAdjustValue: number;
  classScoreAdjustReason: string;
  currentClassScore: number | null;
  canManageSystem: boolean;
  onClassScoreAdjustValueChange: (value: number) => void;
  onClassScoreAdjustReasonChange: (reason: string) => void;
  onAdjustClassScore: () => Promise<void>;
}

interface AdjustRecord {
  time: string;
  value: number;
  reason: string;
}

export function ClassScoreAdjust({
  classScoreAdjustValue,
  classScoreAdjustReason,
  currentClassScore,
  canManageSystem,
  onClassScoreAdjustValueChange,
  onClassScoreAdjustReasonChange,
  onAdjustClassScore,
}: ClassScoreAdjustProps) {
  const [adjustHistory, setAdjustHistory] = useState<AdjustRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleAdjust = async () => {
    if (!classScoreAdjustReason.trim() || classScoreAdjustValue === 0) return;

    await onAdjustClassScore();

    // 添加到历史记录
    setAdjustHistory((prev) => [
      {
        time: new Date().toLocaleString('zh-CN'),
        value: classScoreAdjustValue,
        reason: classScoreAdjustReason,
      },
      ...prev,
    ]);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>班级总分调整</Typography>
          <Typography variant="body2" color="text.secondary">
            手动调整班级总分，将生成一条调整记录。当前班级总分：{currentClassScore ?? '--'}
          </Typography>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography>调整分值</Typography>
              <Chip
                size="small"
                label={classScoreAdjustValue > 0 ? `+${classScoreAdjustValue}` : classScoreAdjustValue}
                color={classScoreAdjustValue > 0 ? 'success' : classScoreAdjustValue < 0 ? 'error' : 'default'}
              />
            </Stack>
            <Slider
              value={classScoreAdjustValue}
              min={-50}
              max={50}
              step={1}
              marks={[
                { value: -50, label: '-50' },
                { value: 0, label: '0' },
                { value: 50, label: '+50' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => Number(value) > 0 ? `+${value}` : String(value)}
              onChange={(_event, value) => onClassScoreAdjustValueChange(Number(value))}
              disabled={!canManageSystem}
            />
          </Box>
          <TextField
            label="调整原因"
            value={classScoreAdjustReason}
            onChange={(e) => onClassScoreAdjustReasonChange(e.target.value)}
            placeholder="如：班级活动奖励、处罚等"
            disabled={!canManageSystem}
            fullWidth
          />
          <Button
            variant="contained"
            color="warning"
            onClick={handleAdjust}
            disabled={!canManageSystem || classScoreAdjustValue === 0 || !classScoreAdjustReason.trim()}
          >
            确认调整班级总分
          </Button>

          {/* 调整历史记录 */}
          {adjustHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button size="small" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? '隐藏' : '显示'}最近调整记录 ({adjustHistory.length})
              </Button>
              <Collapse in={showHistory}>
                <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                  <Stack spacing={1}>
                    {adjustHistory.slice(0, 5).map((record, index) => (
                      <Box key={index} sx={{ fontSize: '0.875rem' }}>
                        <Typography variant="caption" color="text.secondary">{record.time}</Typography>
                        <Box>
                          <Chip
                            size="small"
                            label={record.value > 0 ? `+${record.value}` : record.value}
                            color={record.value > 0 ? 'success' : 'error'}
                            sx={{ mr: 1, height: 20, fontSize: '0.75rem' }}
                          />
                          <Typography component="span" variant="body2">{record.reason}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
