import { Box, Button, Card, CardContent, Chip, MenuItem, Slider, Stack, Switch, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CampaignIcon from '@mui/icons-material/Campaign';
import type { DashboardSettings } from '@shared/types';
import { layoutLabels } from '../constants';

interface DisplaySettingsProps {
  dashboardSettings: DashboardSettings;
  canManageSystem: boolean;
  onDashboardSettingsChange: React.Dispatch<React.SetStateAction<DashboardSettings>>;
  onSave: () => void;
}

export function DisplaySettings({ dashboardSettings, canManageSystem, onDashboardSettingsChange, onSave }: DisplaySettingsProps) {
  return (
    <Stack spacing={3}>
      {/* 模块显示设置 */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewModuleIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>模块显示</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              控制大屏上各模块的显示与隐藏
            </Typography>
            <Stack spacing={2}>
              {Object.entries(dashboardSettings.modules).map(([key, value]) => (
                <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>{layoutLabels[key] ?? key}</Typography>
                  <Switch
                    checked={value}
                    onChange={(e) => onDashboardSettingsChange((prev) => ({
                      ...prev,
                      modules: { ...prev.modules, [key]: e.target.checked }
                    }))}
                    disabled={!canManageSystem}
                  />
                </Stack>
              ))}
            </Stack>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography>模块背景透明度</Typography>
                <Chip size="small" label={`${Math.round((dashboardSettings.moduleOpacity ?? 0.85) * 100)}%`} />
              </Stack>
              <Slider
                value={dashboardSettings.moduleOpacity ?? 0.85}
                min={0}
                max={1}
                step={0.01}
                marks={[{ value: 0, label: '0%' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(Number(value) * 100)}%`}
                onChange={(_event, value) => onDashboardSettingsChange((prev) => ({ ...prev, moduleOpacity: Number(value) }))}
                disabled={!canManageSystem}
              />
              <Typography variant="caption" color="text.secondary">
                只影响模块容器背景，不影响文字内容
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* 背景设置 */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <WallpaperIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>背景设置</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              自定义大屏背景样式
            </Typography>
            <Stack spacing={3}>
              <TextField
                select
                label="背景类型"
                value={dashboardSettings.backgroundType}
                onChange={(e) => onDashboardSettingsChange((prev) => ({
                  ...prev,
                  backgroundType: e.target.value as typeof prev.backgroundType
                }))}
                disabled={!canManageSystem}
              >
                <MenuItem value="gradient">渐变背景</MenuItem>
                <MenuItem value="image">背景图</MenuItem>
                <MenuItem value="video">背景视频</MenuItem>
              </TextField>
              <TextField
                label="背景值（URL 或渐变字符串）"
                value={dashboardSettings.backgroundValue}
                onChange={(e) => onDashboardSettingsChange((prev) => ({ ...prev, backgroundValue: e.target.value }))}
                disabled={!canManageSystem}
              />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography>背景蒙版透明度</Typography>
                  <Chip size="small" label={`${Math.round(dashboardSettings.overlayOpacity * 100)}%`} />
                </Stack>
                <Slider
                  value={dashboardSettings.overlayOpacity}
                  min={0}
                  max={1}
                  step={0.01}
                  marks={[{ value: 0, label: '0%' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${Math.round(Number(value) * 100)}%`}
                  onChange={(_event, value) => onDashboardSettingsChange((prev) => ({ ...prev, overlayOpacity: Number(value) }))}
                  disabled={!canManageSystem}
                />
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 班级口号设置 */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CampaignIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>班级口号</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              设置大屏上展示的班级口号
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography>展示班级口号</Typography>
                <Switch
                  checked={dashboardSettings.showClassSlogan}
                  onChange={(e) => onDashboardSettingsChange((prev) => ({
                    ...prev,
                    showClassSlogan: e.target.checked
                  }))}
                  disabled={!canManageSystem}
                />
              </Stack>
              <TextField
                label="班级口号"
                value={dashboardSettings.classSlogan}
                onChange={(e) => onDashboardSettingsChange((prev) => ({ ...prev, classSlogan: e.target.value }))}
                disabled={!canManageSystem}
                placeholder="请输入班级口号"
                multiline
                rows={2}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <Box>
        <Button 
          startIcon={<SaveIcon />} 
          variant="contained" 
          onClick={onSave} 
          disabled={!canManageSystem}
          fullWidth
          size="large"
        >
          保存展示设置
        </Button>
      </Box>
    </Stack>
  );
}
