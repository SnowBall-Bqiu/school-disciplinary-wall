import { Alert, Box, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import type { DashboardLayoutItem } from '@shared/types';
import { GRID_COLUMNS, GRID_ROW_HEIGHT, clamp, layoutLabels } from './constants';
import type { LayoutEditorProps, LayoutUpdater } from './types';

export function LayoutEditor({ dashboardSettings, canManageSystem, onDashboardSettingsChange }: LayoutEditorProps) {
  const theme = useTheme();
  const layoutEditorRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const layoutRows = Math.max(6, ...dashboardSettings.layout.map((item) => item.y + item.h + 1));

  function updateLayoutItem(id: string, updater: LayoutUpdater) {
    onDashboardSettingsChange((prev) => ({
      ...prev,
      layout: prev.layout.map((item) => {
        if (item.id !== id) return item;
        const next = updater(item);
        return {
          ...next,
          x: clamp(next.x, 0, GRID_COLUMNS - next.w),
          y: clamp(next.y, 0, 20),
          w: clamp(next.w, 2, GRID_COLUMNS),
          h: clamp(next.h, 1, 8),
        };
      }),
    }));
  }

  function handleLayoutPointerDown(item: DashboardLayoutItem, event: React.PointerEvent<HTMLDivElement>) {
    const editor = layoutEditorRef.current;
    if (!canManageSystem || !editor) return;
    let rect;
    try {
      rect = editor.getBoundingClientRect();
    } catch {
      return;
    }
    const columnWidth = rect.width / GRID_COLUMNS;
    dragStateRef.current = {
      id: item.id,
      offsetX: event.clientX - rect.left - item.x * columnWidth,
      offsetY: event.clientY - rect.top - item.y * GRID_ROW_HEIGHT,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLayoutPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const editor = layoutEditorRef.current;
    if (!canManageSystem || !editor || !dragStateRef.current) return;
    let rect;
    try {
      rect = editor.getBoundingClientRect();
    } catch {
      return;
    }
    const columnWidth = rect.width / GRID_COLUMNS;
    const active = dashboardSettings.layout.find((item) => item.id === dragStateRef.current?.id);
    if (!active) return;
    const rawX = event.clientX - rect.left - dragStateRef.current.offsetX;
    const rawY = event.clientY - rect.top - dragStateRef.current.offsetY;
    const nextX = clamp(Math.round(rawX / columnWidth), 0, GRID_COLUMNS - active.w);
    const nextY = clamp(Math.round(rawY / GRID_ROW_HEIGHT), 0, 20);
    updateLayoutItem(active.id, (item) => ({ ...item, x: nextX, y: nextY }));
  }

  function handleLayoutPointerUp() {
    dragStateRef.current = null;
  }

  function renderLayoutEditorItem(item: DashboardLayoutItem) {
    return (
      <Paper
        key={item.id}
        onPointerDown={(event) => handleLayoutPointerDown(item, event)}
        sx={{
          position: 'absolute',
          left: `${(item.x / GRID_COLUMNS) * 100}%`,
          top: item.y * GRID_ROW_HEIGHT,
          width: `calc(${(item.w / GRID_COLUMNS) * 100}% - 8px)`,
          height: item.h * GRID_ROW_HEIGHT - 8,
          p: 1.5,
          borderRadius: 3,
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 24px rgba(15,23,42,0.16)',
          cursor: canManageSystem ? 'grab' : 'default',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={1} sx={{ height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <DragIndicatorIcon fontSize="small" />
              <Typography fontWeight={800}>{layoutLabels[item.id] ?? item.id}</Typography>
            </Stack>
            <Chip size="small" label={`${item.w}×${item.h}`} color="primary" variant="outlined" />
          </Stack>
          <Typography variant="caption" color="text.secondary">拖动卡片可自由调整位置，右下区域可微调尺寸。</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="宽" type="number" value={item.w} onChange={(e) => updateLayoutItem(item.id, (target) => ({ ...target, w: Number(e.target.value) }))} disabled={!canManageSystem} />
            <TextField size="small" label="高" type="number" value={item.h} onChange={(e) => updateLayoutItem(item.id, (target) => ({ ...target, h: Number(e.target.value) }))} disabled={!canManageSystem} />
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {/*<Typography variant="h6" fontWeight={800}>布局编辑</Typography>*/}
      <Alert severity="info">在下方画布中直接拖动模块卡片位置，保存后大屏将按坐标与尺寸真实渲染。</Alert>
      <Box
        ref={layoutEditorRef}
        onPointerMove={handleLayoutPointerMove}
        onPointerUp={handleLayoutPointerUp}
        onPointerLeave={handleLayoutPointerUp}
        sx={{
          position: 'relative',
          height: layoutRows * GRID_ROW_HEIGHT,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#e2e8f0',
          backgroundImage: theme.palette.mode === 'dark'
            ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
            : 'linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)',
          backgroundSize: `calc(100% / ${GRID_COLUMNS}) ${GRID_ROW_HEIGHT}px`,
        }}
      >
        {dashboardSettings.layout.map(renderLayoutEditorItem)}
      </Box>
    </Stack>
  );
}
