import type { DashboardSettings } from './types';

export const defaultDashboardSettings: DashboardSettings = {
  backgroundType: 'gradient',
  backgroundValue: 'linear-gradient(135deg, #061b3a 0%, #123f73 55%, #2563eb 100%)',
  overlayOpacity: 0.58,
  modules: {
    weather: true,
    quote: true,
    ranking: true,
    bulletin: true,
    classScore: true,
    dateTime: true,
  },

  layout: [
    { id: 'clock', x: 0, y: 0, w: 4, h: 2 },
    { id: 'weather', x: 4, y: 0, w: 4, h: 2 },
    { id: 'quote', x: 8, y: 0, w: 4, h: 2 },
    { id: 'classScore', x: 0, y: 2, w: 3, h: 2 },
    { id: 'ranking', x: 3, y: 2, w: 5, h: 4 },
    { id: 'bulletin', x: 8, y: 2, w: 4, h: 4 },
  ],
  rankingSize: 10,
  reminderSize: 3,
  classSlogan: '与后台统一的系统风格展示页，适合教室一体机常驻展示。',
  showClassSlogan: true,
  moduleOpacity: 0.85,
};


export const defaultQuotes = [
  '把平凡的小事做好，就是不平凡。',
  '今天比昨天多进步一点，就是成长。',
  '好的班风，从每一次自律开始。',
  '尊重规则，也是尊重更好的自己。',
  '每一次加分，都值得被认真记录。',
];
