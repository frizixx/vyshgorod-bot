export const config = {
  botToken: process.env.BOT_TOKEN || '9208357626:AAF3vLUONY_AMVGIRfrSXdoQxVLwpg9ry_g',
  port: process.env.PORT || 3000,

  // Sources
  sources: {
    news: 'https://vyshgorod.in.ua/',
    alerts: 'https://api.ukrainealarm.com/api/v3/alerts', // Free API for alerts
    weather: 'https://wttr.in/Vyshgorod?format=j1'
  },

  // Update intervals (in minutes)
  intervals: {
    news: 30,
    alerts: 1, // Check alerts every minute
    weather: 60
  },

  // Blackout schedules by queue
  blackoutSchedules: {
    '1': [
      { start: '08:00', end: '12:00' },
      { start: '16:00', end: '20:00' }
    ],
    '2': [
      { start: '06:00', end: '10:00' },
      { start: '14:00', end: '18:00' }
    ],
    '3': [
      { start: '10:00', end: '14:00' },
      { start: '20:00', end: '00:00' }
    ],
    '4': [
      { start: '00:00', end: '04:00' },
      { start: '12:00', end: '16:00' }
    ]
  }
};
