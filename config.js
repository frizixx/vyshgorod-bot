export const config = {
  botToken: process.env.BOT_TOKEN,
  port: process.env.PORT || 8080,

  // Sources
  sources: {
    news: 'https://vyshgorod.in.ua/',
    alerts: 'https://alerts.in.ua/api/states',
    weather: 'https://wttr.in/Vyshgorod?format=j1',
    blackouts: 'https://vyshgorod.in.ua/svitlo'
  },

  // API keys (optional)
  alertsApiKey: process.env.ALERTS_API_KEY || '', // ukrainealarm.com API key (optional)

  // Update intervals (in minutes)
  intervals: {
    news: 30,
    alerts: 1, // Check alerts every minute
    weather: 60
  },

  // Blackout schedules by group (DTEK standard schedule for Kyiv region)
  // These are EXAMPLE schedules - users should check actual times on vyshgorod.in.ua/svitlo
  blackoutSchedules: {
    '1.1': [
      { start: '00:00', end: '04:00' },
      { start: '08:00', end: '12:00' },
      { start: '16:00', end: '20:00' }
    ],
    '1.2': [
      { start: '04:00', end: '08:00' },
      { start: '12:00', end: '16:00' },
      { start: '20:00', end: '23:59' }
    ],
    '2.1': [
      { start: '02:00', end: '06:00' },
      { start: '10:00', end: '14:00' },
      { start: '18:00', end: '22:00' }
    ],
    '2.2': [
      { start: '06:00', end: '10:00' },
      { start: '14:00', end: '18:00' },
      { start: '22:00', end: '02:00' }
    ],
    '3.1': [
      { start: '01:00', end: '05:00' },
      { start: '09:00', end: '13:00' },
      { start: '17:00', end: '21:00' }
    ],
    '3.2': [
      { start: '05:00', end: '09:00' },
      { start: '13:00', end: '17:00' },
      { start: '21:00', end: '01:00' }
    ]
  },

  // Типы тревог
  alertTypes: {
    'air': '🚨 ПОВІТРЯНА ТРИВОГА',
    'artillery': '💥 АРТИЛЕРІЙСЬКА ТРИВОГА',
    'urban_fights': '⚔️ МІСЬКІ БОЇ',
    'chemical': '☢️ ХІМІЧНА ТРИВОГА',
    'nuclear': '☢️ РАДІАЦІЙНА ТРИВОГА'
  }
};
