import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useThemeMode } from '../context/theme-mode-context';
import { apiFetch } from '../lib/api';
import type { DashboardResponse } from '../types/api';
import { defaultQuotes } from '@shared/defaults';

const moduleIdMap: Record<string, string> = {
  clock: 'dateTime',
  weather: 'weather',
  quote: 'quote',
  classScore: 'classScore',
  ranking: 'ranking',
  bulletin: 'bulletin',
};

const panelSx = {
  p: 2.5,
  height: '100%',
  borderRadius: 1,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function DashboardPage() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [clock, setClock] = useState(new Date());
  const [weatherText, setWeatherText] = useState('天气加载中...');
  const overlayOpacity = data?.dashboardSettings.overlayOpacity ?? 0.58;
  const darkOverlayStart = Math.min(1, overlayOpacity + 0.16);
  const darkOverlayEnd = Math.min(1, overlayOpacity + 0.26);
  const lightOverlayStart = Math.min(1, Math.max(0, overlayOpacity - 0.16));
  const lightOverlayEnd = Math.min(1, overlayOpacity + 0.06);


  useEffect(() => {
    apiFetch<DashboardResponse>('/api/dashboard').then(setData).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('https://wttr.in/?format=j1')
      .then((response) => response.json())
      .then((result) => {
        const current = result?.current_condition?.[0];
        setWeatherText(`${current?.temp_C ?? '--'}℃ / ${current?.weatherDesc?.[0]?.value ?? '晴'}`);
      })
      .catch(() => {
        setWeatherText('天气暂不可用');
      });
  }, []);

  const { preference, setPreference } = useThemeMode();
  const quote = useMemo(() => defaultQuotes[new Date().getDate() % defaultQuotes.length], []);

  const visibleLayout = useMemo(
    () =>
      (data?.dashboardSettings.layout ?? []).filter((item) => {
        const settingKey = moduleIdMap[item.id];
        if (!settingKey) return true;
        return Boolean(data?.dashboardSettings.modules?.[settingKey as keyof typeof data.dashboardSettings.modules]);
      }),
    [data],
  );
  const topStudents = data?.students.slice(0, data?.dashboardSettings.rankingSize ?? 10) ?? [];
  const bottomStudents = data?.students.slice(-(data?.dashboardSettings.reminderSize ?? 3)) ?? [];




  const bgSx = useMemo(() => {
    const settings = data?.dashboardSettings;
    if (!settings) {
      return { backgroundColor: 'background.default' };
    }
    if (settings.backgroundType === 'gradient') {
      return {
        background: settings.backgroundValue || (theme.palette.mode === 'dark' ? 'linear-gradient(135deg, #0b1220 0%, #111827 100%)' : 'linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%)'),
      };
    }
    if (settings.backgroundType === 'image' && settings.backgroundValue) {
      return {
        backgroundImage: `linear-gradient(${theme.palette.mode === 'dark' ? 'rgba(11,18,32,0.70)' : 'rgba(248,250,252,0.62)'}, ${theme.palette.mode === 'dark' ? 'rgba(11,18,32,0.82)' : 'rgba(248,250,252,0.78)'}), url(${settings.backgroundValue})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {
      backgroundColor: 'background.default',
    };
  }, [data?.dashboardSettings, theme.palette.mode, darkOverlayStart, darkOverlayEnd, lightOverlayStart, lightOverlayEnd]);







  const cards = useMemo(
    () => ({
      clock: (
        <Paper sx={{ ...panelSx, boxShadow: theme.palette.mode === 'dark' ? '0 10px 24px rgba(2, 6, 23, 0.28)' : panelSx.boxShadow }}>
          <Stack spacing={1.5} height="100%" justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">当前时间</Typography>
              <Typography variant="h4" fontWeight={800} mt={1.5}>{formatClock(clock)}</Typography>
            </Box>
            <Chip size="small" label="实时刷新" color="primary" sx={{ alignSelf: 'flex-start' }} />
          </Stack>
        </Paper>
      ),
      weather: (
        <Paper sx={{ ...panelSx, boxShadow: theme.palette.mode === 'dark' ? '0 10px 24px rgba(2, 6, 23, 0.28)' : panelSx.boxShadow }}>
          <Stack spacing={1.5} height="100%" justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">实时天气</Typography>
              <Typography variant="h4" fontWeight={800} mt={1.5}>{weatherText}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">接口失效时自动降级显示。</Typography>
          </Stack>
        </Paper>
      ),
      quote: (
        <Paper sx={{ ...panelSx, boxShadow: theme.palette.mode === 'dark' ? '0 10px 24px rgba(2, 6, 23, 0.28)' : panelSx.boxShadow }}>
          <Stack spacing={2} height="100%">
            <Typography variant="overline" color="text.secondary">每日一言</Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>{quote}</Alert>
            <Typography variant="body2" color="text.secondary">支持离线内置文案展示。</Typography>
          </Stack>
        </Paper>
      ),
      classScore: (
        <Paper sx={{ ...panelSx, bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'primary.light', boxShadow: theme.palette.mode === 'dark' ? '0 12px 28px rgba(37, 99, 235, 0.22)' : '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
          <Stack spacing={1.5} height="100%" justifyContent="space-between">
            <Typography variant="overline" sx={{ opacity: 0.84 }}>当前班级总分</Typography>
            <Typography variant="h1" fontWeight={900} lineHeight={1}>{data?.classInfo?.current_class_score ?? '--'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.88 }}>保持班级荣誉感，稳步向上。</Typography>
          </Stack>
        </Paper>
      ),
      ranking: (
        <Paper sx={{ ...panelSx, boxShadow: theme.palette.mode === 'dark' ? '0 10px 24px rgba(2, 6, 23, 0.28)' : panelSx.boxShadow }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>德育分排行榜</Typography>
              <Chip size="small" label={`Top ${topStudents.length}`} color="success" />
            </Stack>
            <List dense sx={{ p: 0 }}>
              {topStudents.map((student, index) => (
                <ListItem
                  key={student.id}
                  secondaryAction={<Chip size="small" label={`${student.current_score} 分`} color={index < 3 ? 'success' : 'default'} />}
                  sx={{ mb: 1, px: 1.25, borderRadius: 1, bgcolor: index < 3 ? (theme.palette.mode === 'dark' ? 'rgba(34,197,94,0.18)' : 'rgba(46, 125, 50, 0.1)') : 'action.hover' }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: index < 3 ? 'success.main' : 'grey.500' }}>{index + 1}</Avatar>
                    <ListItemText primary={`${student.name}（${student.student_no}）`} slotProps={{ primary: { sx: { fontWeight: 700, fontSize: 14 } } }} />
                  </Stack>
                </ListItem>
              ))}
            </List>
            <Divider />
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={800} color="text.secondary">末位提醒</Typography>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'flex-start', minHeight: 72 }}>
                {bottomStudents.map((student) => (
                  <Chip key={student.id} color="warning" label={`${student.name} | ${student.current_score}分`} sx={{ borderRadius: 999, px: 0.5, fontWeight: 700 }} />
                ))}
              </Box>
            </Stack>
          </Stack>
        </Paper>
      ),
      bulletin: (
        <Paper sx={{ ...panelSx, boxShadow: theme.palette.mode === 'dark' ? '0 10px 24px rgba(2, 6, 23, 0.28)' : panelSx.boxShadow }}>
          <Stack spacing={1.5} height="100%">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>今日通报</Typography>
              <Chip size="small" label={`${(data?.records ?? []).slice(0, 10).length} 条`} />
            </Stack>
            <List dense sx={{ p: 0 }}>
              {(data?.records ?? []).slice(0, 10).map((record) => (
                <ListItem
                  key={record.id}
                  secondaryAction={<Stack direction="row" spacing={0.75} alignItems="center" sx={{ pt: 0.25 }}>{record.is_revoked ? <Chip size="small" label="已撤销" /> : null}<Chip size="small" label={new Date(record.created_at).toLocaleString('zh-CN')} /></Stack>}
                  sx={{ mb: 1, px: 1.25, py: 0.9, borderRadius: 2, alignItems: 'flex-start', bgcolor: 'action.hover' }}
                >
                  <ListItemText
                    primary={`${record.student_id === 0 ? '班级' : data?.studentMap[record.student_id] ?? `学生ID ${record.student_id}`} · ${record.reason}`}
                    secondary={`操作人：${data?.userMap[record.operator_id] ?? `用户ID ${record.operator_id}`} · 变动 ${record.change_value > 0 ? `+${record.change_value}` : record.change_value} 分`}
                    slotProps={{ primary: { sx: { fontWeight: 700, fontSize: 14 } }, secondary: { sx: { fontSize: 12, mt: 0.35 } } }}
                  />
                </ListItem>
              ))}
            </List>
          </Stack>
        </Paper>
      ),
    }),
    [clock, data, quote, topStudents, bottomStudents, weatherText, theme.palette.mode],
  );

  return (
    <Box sx={{ minHeight: '100vh', py: 3, position: 'relative', overflow: 'hidden', ...bgSx }}>
      {data?.dashboardSettings.backgroundType === 'video' && data.dashboardSettings.backgroundValue ? (
        <Box
          component="video"
          autoPlay
          muted
          loop
          playsInline
          src={data.dashboardSettings.backgroundValue}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: theme.palette.mode === 'dark' ? 0.22 : 0.3,
          }}
        />
      ) : null}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(rgba(11,18,32,${darkOverlayStart.toFixed(2)}), rgba(11,18,32,${darkOverlayEnd.toFixed(2)}))`
            : `linear-gradient(rgba(248,250,252,${lightOverlayStart.toFixed(2)}), rgba(248,250,252,${lightOverlayEnd.toFixed(2)}))`,

          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}>

        <Stack spacing={2.5}>
          <Paper sx={{ px: 2.5, py: 2, borderRadius: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: theme.palette.mode === 'dark' ? '0 12px 28px rgba(2, 6, 23, 0.35)' : '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
              <Box>
                <Typography variant="h4" fontWeight={900}>{data?.classInfo?.class_name ?? '班级大屏'}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>与后台统一的系统风格展示页，适合教室一体机常驻展示。</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => setPreference(preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light')}
                  startIcon={preference === 'light' ? <LightModeIcon /> : preference === 'dark' ? <DarkModeIcon /> : <BrightnessAutoIcon />}
                  sx={{ minWidth: 0 }}
                >
                  {preference === 'light' ? '浅色' : preference === 'dark' ? '深色' : '自动'}
                </Button>
                <Chip size="small" label={`展示模块：${visibleLayout.length}`} color="primary" />
                <Chip size="small" label={`更新时间：${formatClock(clock)}`} />
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 2, gridAutoRows: '72px' }}>
            {visibleLayout.map((item) => (
              <Box
                key={item.id}
                sx={{
                  gridColumn: `${item.x + 1} / span ${Math.min(item.w, 12)}`,
                  gridRow: `${item.y + 1} / span ${item.h}`,
                  minHeight: 0,
                }}
              >
                {cards[item.id as keyof typeof cards] ?? null}
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

