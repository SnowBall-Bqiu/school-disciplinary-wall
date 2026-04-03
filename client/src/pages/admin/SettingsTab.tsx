import { Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, List, ListItemButton, ListItemText, Slider, Stack, Switch, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useState } from 'react';
import { settingsSections } from './constants';
import { LayoutEditor } from './LayoutEditor';
import { LogsTab } from './LogsTab';
import { ClassInfoSettings } from './settings/ClassInfoSettings';
import { ClassScoreAdjust } from './settings/ClassScoreAdjust';
import { DisplaySettings } from './settings/DisplaySettings';
import { RankingSettings } from './settings/RankingSettings';
import { DangerZoneSettings } from './settings/DangerZoneSettings';
import type { SettingsTabProps } from './types';

export { ClassInfoSettings, ClassScoreAdjust, DisplaySettings, RankingSettings, DangerZoneSettings };

interface ExtendedSettingsTabProps extends SettingsTabProps {
  storageMode: string;
  canReset: boolean;
  onSwitchStorageMode: (mode: 'sqlite' | 'sqljs') => void;
  onExportJson: () => void;
  onResetClassData: () => void;
  logs?: any[];
  userMap?: Record<number, string>;
  onRollback?: (id: number) => void;
  onCancelRollback?: (id: number) => void;
  onDeleteLog?: (id: number) => void;
  onDeleteLogs?: (ids: number[]) => void;
  canRollback?: boolean;
  canDeleteLog?: boolean;
}

export function SettingsTab({
  settingsSection,
  dashboardSettings,
  canManageSystem,
  canReset,
  storageMode,
  classInfo,
  classScoreAdjustValue,
  classScoreAdjustReason,
  onSectionChange,
  onDashboardSettingsChange,
  onSaveDashboard,
  onUpdateClassInfo,
  onClassScoreAdjustValueChange,
  onClassScoreAdjustReasonChange,
  onAdjustClassScore,
  onSwitchStorageMode,
  onExportJson,
  onResetClassData,
  logs,
  userMap,
  onRollback,
  onCancelRollback,
  onDeleteLog,
  onDeleteLogs,
  canRollback,
  canDeleteLog,
}: ExtendedSettingsTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card><CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>系统设置</Typography>
          <List disablePadding>
            {settingsSections.map((section) => (
              <ListItemButton key={section.id} selected={settingsSection === section.id} onClick={() => onSectionChange(section.id)} sx={{ borderRadius: 1, mb: 1 }}>
                <ListItemText primary={section.label} />
              </ListItemButton>
            ))}
          </List>
        </CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 9 }}>
        {settingsSection === 'class' ? (
          <Stack spacing={3}>
            <ClassInfoSettings
              classInfo={classInfo}
              canManageSystem={canManageSystem}
              onUpdateClassInfo={onUpdateClassInfo}
            />
            <ClassScoreAdjust
              classScoreAdjustValue={classScoreAdjustValue}
              classScoreAdjustReason={classScoreAdjustReason}
              currentClassScore={classInfo?.current_class_score ?? null}
              canManageSystem={canManageSystem}
              onClassScoreAdjustValueChange={onClassScoreAdjustValueChange}
              onClassScoreAdjustReasonChange={onClassScoreAdjustReasonChange}
              onAdjustClassScore={onAdjustClassScore}
            />
          </Stack>
        ) : null}
        {settingsSection === 'display' ? (
          <DisplaySettings
            dashboardSettings={dashboardSettings}
            canManageSystem={canManageSystem}
            onDashboardSettingsChange={onDashboardSettingsChange}
            onSave={onSaveDashboard}
          />
        ) : null}
        {settingsSection === 'ranking' ? (
          <RankingSettings
            dashboardSettings={dashboardSettings}
            canManageSystem={canManageSystem}
            onDashboardSettingsChange={onDashboardSettingsChange}
            onSave={onSaveDashboard}
          />
        ) : null}
        {settingsSection === 'layout' ? (
          <Card><CardContent>
            <LayoutEditor dashboardSettings={dashboardSettings} canManageSystem={canManageSystem} onDashboardSettingsChange={onDashboardSettingsChange} />
          </CardContent></Card>
        ) : null}
        {settingsSection === 'logs' ? (
          logs && userMap ? (
            <LogsTab
              logs={logs}
              userMap={userMap}
              onRollback={onRollback ?? (() => {})}
              onCancelRollback={onCancelRollback}
              onDeleteLog={onDeleteLog}
              onDeleteLogs={onDeleteLogs}
              canRollback={canRollback ?? false}
              canDeleteLog={canDeleteLog}
            />
          ) : (
            <Card><CardContent>
              <Typography color="text.secondary">加载中...</Typography>
            </CardContent></Card>
          )
        ) : null}
        {settingsSection === 'danger' ? (
          <DangerZoneSettings
            storageMode={storageMode}
            canManageSystem={canManageSystem}
            canReset={canReset}
            onSwitchStorageMode={onSwitchStorageMode}
            onExportJson={onExportJson}
            onResetClassData={onResetClassData}
          />
        ) : null}
      </Grid>
    </Grid>
  );
}