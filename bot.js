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
    bot.sendMessage(chatId, 'Оберіть вашу групу відключень:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Група 1.1', callback_data: 'queue_1.1' }, { text: 'Група 1.2', callback_data: 'queue_1.2' }],
          [{ text: 'Група 2.1', callback_data: 'queue_2.1' }, { text: 'Група 2.2', callback_data: 'queue_2.2' }],
          [{ text: 'Група 3.1', callback_data: 'queue_3.1' }, { text: 'Група 3.2', callback_data: 'queue_3.2' }]
        ]
      }
    });
  });

  // Callback handlers
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('queue_')) {
      const queueNum = data.split('_')[1];
      queries.setUserQueue.run(queueNum, chatId);

      bot.answerCallbackQuery(query.id, { text: `Вибрано групу ${queueNum}` });
      bot.sendMessage(chatId,
        `✅ Ви обрали групу ${queueNum}\n\n` +
        `Графік відключень:\n${formatSchedule(queueNum)}`
      );
    }

    if (data === 'toggle_notif') {
      const user = queries.getUser.get(chatId);
      const newState = user?.notifications_enabled ? 0 : 1;
      queries.toggleNotifications.run(newState, chatId);

      bot.answerCallbackQuery(query.id, {
        text: newState ? 'Сповіщення увімкнені' : 'Сповіщення вимкнені'
      });

      bot.sendMessage(chatId,
        `✅ Сповіщення ${newState ? 'увімкнені' : 'вимкнені'}`
      );
    }
  });

  // Keyboard button handlers
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📰 Новини') {
      try {
        bot.sendMessage(chatId, '📰 Завантажую останні новини...');
        const { fetchNews } = await import('./parsers.js');
        const articles = await fetchNews();

        if (articles.length === 0) {
          bot.sendMessage(chatId, '❌ Не вдалося завантажити новини. Спробуйте пізніше.');
          return;
        }

        for (const article of articles.slice(0, 3)) {
          await bot.sendMessage(chatId,
            `📰 *${article.title}*\n\n` +
            `${article.excerpt ? article.excerpt + '\n\n' : ''}` +
            `[Читати повністю](${article.link})`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        bot.sendMessage(chatId, '❌ Помилка завантаження новин');
      }
    }

    if (text === '🔌 Графік відключень') {
      const user = queries.getUser.get(chatId);
      if (user?.queue_number) {
        bot.sendMessage(chatId,
          `🔌 Графік відключень для групи ${user.queue_number}:\n\n` +
          formatSchedule(user.queue_number)
        );
      } else {
        bot.sendMessage(chatId, 'Спочатку оберіть групу командою /queue');
      }
    }

    if (text === '🚨 Тривоги') {
      try {
        bot.sendMessage(chatId, '🚨 Перевіряю стан тривоги...');
        const { checkAlerts } = await import('./parsers.js');
        const alertStatus = await checkAlerts();

        if (alertStatus.active) {
          const alertType = config.alertTypes[alertStatus.type] || '🚨 ТРИВОГА';
          bot.sendMessage(chatId,
            `${alertType}\n\n` +
            `Вишгородський район\n` +
            `Статус: АКТИВНА\n\n` +
            `Будьте в безпеці! 🙏`,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(chatId,
            `✅ *Тривог немає*\n\n` +
            `Вишгородський район\n` +
            `Статус: СПОКІЙНО`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
        bot.sendMessage(chatId, '❌ Помилка перевірки тривог');
      }
    }

    if (text === '🌤 Погода') {
      try {
        bot.sendMessage(chatId, '🌤 Завантажую прогноз погоди...');
        const { getWeather } = await import('./parsers.js');
        const weather = await getWeather();

        if (weather) {
          bot.sendMessage(chatId,
            `🌤 *Погода у Вишгороді*\n\n` +
            `🌡 Температура: ${weather.temp}°C (відчувається як ${weather.feelsLike}°C)\n` +
            `☁️ ${weather.description}\n` +
            `💧 Вологість: ${weather.humidity}%\n` +
            `💨 Вітер: ${weather.windSpeed} км/год\n\n` +
            `Оновлено: ${new Date().toLocaleTimeString('uk-UA')}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(chatId, '❌ Не вдалося завантажити погоду');
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        bot.sendMessage(chatId, '❌ Помилка завантаження погоди');
      }
    }

    if (text === '⚙️ Налаштування') {
      const user = queries.getUser.get(chatId);
      const notifStatus = user?.notifications_enabled ? 'Увімкнені ✅' : 'Вимкнені ❌';

      bot.sendMessage(chatId,
        `⚙️ Налаштування:\n\n` +
        `Група: ${user?.queue_number || 'Не обрано'}\n` +
        `Сповіщення: ${notifStatus}\n\n` +
        `Використовуйте /queue для зміни групи`,
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
