import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { queries } from './db.js';

export function createBot() {
  const bot = new TelegramBot(config.botToken, { polling: true });

  // Start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;

    queries.addUser.run(chatId, username, firstName, null);

    bot.sendMessage(chatId,
      `Вітаю, ${firstName}! 👋\n\n` +
      `Я бот для жителів Вишгорода з актуальною інформацією:\n\n` +
      `🔌 Графіки відключень електроенергії\n` +
      `📰 Новини Вишгорода\n` +
      `🚨 Повітряні тривоги\n` +
      `🌤 Погода\n\n` +
      `Виберіть свою чергу відключень командою /queue`,
      {
        reply_markup: {
          keyboard: [
            ['📰 Новини', '🔌 Графік відключень'],
            ['🚨 Тривоги', '🌤 Погода'],
            ['⚙️ Налаштування']
          ],
          resize_keyboard: true
        }
      }
    );
  });

  // Queue selection
  bot.onText(/\/queue/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Оберіть вашу чергу відключень:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Черга 1', callback_data: 'queue_1' }],
          [{ text: 'Черга 2', callback_data: 'queue_2' }],
          [{ text: 'Черга 3', callback_data: 'queue_3' }],
          [{ text: 'Черга 4', callback_data: 'queue_4' }]
        ]
      }
    });
  });

  // Callback handlers
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('queue_')) {
      const queueNum = data.split('_')[1];
      queries.setUserQueue.run(queueNum, chatId);

      bot.answerCallbackQuery(query.id, { text: `Вибрано чергу ${queueNum}` });
      bot.sendMessage(chatId,
        `✅ Ви обрали чергу ${queueNum}\n\n` +
        `Графік відключень:\n${formatSchedule(queueNum)}`
      );
    }
  });

  // Keyboard button handlers
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📰 Новини') {
      bot.sendMessage(chatId, '📰 Завантажую останні новини...');
      // Will be handled by news scheduler
    }

    if (text === '🔌 Графік відключень') {
      const user = queries.getUser.get(chatId);
      if (user?.queue_number) {
        bot.sendMessage(chatId,
          `🔌 Графік відключень для черги ${user.queue_number}:\n\n` +
          formatSchedule(user.queue_number)
        );
      } else {
        bot.sendMessage(chatId, 'Спочатку оберіть чергу командою /queue');
      }
    }

    if (text === '🚨 Тривоги') {
      // Will check current alert status
      bot.sendMessage(chatId, '🚨 Перевіряю стан тривоги...');
    }

    if (text === '🌤 Погода') {
      bot.sendMessage(chatId, '🌤 Завантажую прогноз погоди...');
    }

    if (text === '⚙️ Налаштування') {
      const user = queries.getUser.get(chatId);
      const notifStatus = user?.notifications_enabled ? 'Увімкнені ✅' : 'Вимкнені ❌';

      bot.sendMessage(chatId,
        `⚙️ Налаштування:\n\n` +
        `Черга: ${user?.queue_number || 'Не обрано'}\n` +
        `Сповіщення: ${notifStatus}\n\n` +
        `Використовуйте /queue для зміни черги`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: user?.notifications_enabled ? 'Вимкнути сповіщення' : 'Увімкнути сповіщення',
                 callback_data: 'toggle_notif' }]
            ]
          }
        }
      );
    }
  });

  return bot;
}

function formatSchedule(queueNum) {
  const schedule = config.blackoutSchedules[queueNum];
  if (!schedule) return 'Графік не знайдено';

  return schedule
    .map(slot => `⏰ ${slot.start} - ${slot.end}`)
    .join('\n');
}
