import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type { DashboardSettings } from '@shared/types';

interface RankingSettingsProps {
  dashboardSettings: DashboardSettings;
  canManageSystem: boolean;
  onDashboardSettingsChange: React.Dispatch<React.SetStateAction<DashboardSettings>>;
  onSave: () => void;
}

export function RankingSettings({ dashboardSettings, canManageSystem, onDashboardSettingsChange, onSave }: RankingSettingsProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>排行榜设置</Typography>
          <TextField
            label="排行榜人数"
            type="number"
            value={dashboardSettings.rankingSize}
            onChange={(e) => onDashboardSettingsChange((prev) => ({ ...prev, rankingSize: Number(e.target.value) }))}
            disabled={!canManageSystem}
            inputProps={{ min: 1, max: 50 }}
            helperText="排行榜显示的学生数量"
          />
          <TextField
            label="末位提醒人数"
            type="number"
            value={dashboardSettings.reminderSize}
            onChange={(e) => onDashboardSettingsChange((prev) => ({ ...prev, reminderSize: Number(e.target.value) }))}
            disabled={!canManageSystem}
            inputProps={{ min: 0, max: 10 }}
            helperText="排行榜底部提醒区域显示的学生数量，设为0则不显示"
          />
          <Button startIcon={<SaveIcon />} variant="contained" onClick={onSave} disabled={!canManageSystem}>
            保存排行榜设置
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
