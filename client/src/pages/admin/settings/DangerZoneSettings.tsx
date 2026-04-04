import { Box, Button, Card, CardContent, Divider, Stack, Typography, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import WarningIcon from '@mui/icons-material/Warning';

interface DangerZoneSettingsProps {
  storageMode: string;
  canManageSystem: boolean;
  canReset: boolean;
  onSwitchStorageMode: (mode: 'sqlite' | 'sqljs') => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onResetClassData: () => void;
}

export function DangerZoneSettings({
  storageMode,
  canManageSystem,
  canReset,
  onSwitchStorageMode,
  onExportJson,
  onImportJson,
  onResetClassData,
}: DangerZoneSettingsProps) {

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={800} gutterBottom color="error">
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              危险地带
            </Typography>
            <Typography variant="body2" color="text.secondary">
              以下操作可能会影响系统数据，请谨慎操作。
            </Typography>
          </Box>

          <Alert severity="info">
            当前存储模式：<strong>{storageMode || '--'}</strong>
          </Alert>

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              存储模式切换
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => onSwitchStorageMode('sqlite')}
                disabled={!canManageSystem}
              >
                切换 SQLite
              </Button>
              <Button
                variant="outlined"
                onClick={() => onSwitchStorageMode('sqljs')}
                disabled={!canManageSystem}
              >
                切换 sql.js
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              切换存储模式会重新加载数据库，请确保数据已备份。
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              数据导入/导出
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onExportJson}
                disabled={!canManageSystem}
              >
                导出 JSON
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={onImportJson}
                disabled={!canManageSystem}
              >
                导入 JSON
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              导出会将所有数据保存为 JSON 文件用于备份；导入会从 JSON 文件恢复数据。
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom color="error">
              重置数据
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              警告：重置班级数据将清除所有学生、分数记录和操作日志，此操作不可恢复！
            </Alert>
            <Button
              variant="contained"
              color="error"
              disabled={!canReset}
              onClick={onResetClassData}
            >
              重置班级数据
            </Button>
          </Box>

        </Stack>
      </CardContent>
    </Card>
  );
}
