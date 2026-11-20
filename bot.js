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
      `🌤 Погода\n` +
      `🚌 Розклад маршруток\n` +
      `🆘 Екстрені контакти\n\n` +
      `Виберіть свою чергу відключень командою /queue\n` +
      `Допомога: /help`,
      {
        reply_markup: {
          keyboard: [
            ['📰 Новини', '🔌 Графік відключень'],
            ['🚨 Тривоги', '🌤 Погода'],
            ['🚌 Розклад маршруток', '🆘 Контакти'],
            ['📍 Корисні посилання', '⚙️ Налаштування']
          ],
          resize_keyboard: true
        }
      }
    );
  });

  // Help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      `📚 *Допомога - команди бота:*\n\n` +
      `🎯 *Основні команди:*\n` +
      `/start - Головне меню\n` +
      `/queue - Обрати групу відключень\n` +
      `/help - Ця довідка\n` +
      `/about - Про бота\n\n` +
      `🎨 *Кнопки меню:*\n` +
      `📰 Новини - Останні новини Вишгорода\n` +
      `🔌 Графік відключень - Ваш графік\n` +
      `🚨 Тривоги - Стан повітряної тривоги\n` +
      `🌤 Погода - Прогноз погоди\n` +
      `🚌 Розклад маршруток - Транспорт\n` +
      `🆘 Контакти - Екстрені служби\n` +
      `📍 Корисні посилання - Важливі ресурси\n` +
      `⚙️ Налаштування - Сповіщення\n\n` +
      `💡 *Підказка:* Оберіть групу відключень командою /queue, щоб отримувати персональні сповіщення за 30 хв до відключення!`,
      { parse_mode: 'Markdown' }
    );
  });

  // About command
  bot.onText(/\/about/, (msg) => {
    const chatId = msg.chat.id;
    const totalUsers = queries.getUserCount?.get()?.count || 0;

    bot.sendMessage(chatId,
      `ℹ️ *Про бота*\n\n` +
      `🤖 Вишгород Бот v2.0\n\n` +
      `Бот створений для жителів міста Вишгород та району.\n\n` +
      `📊 *Статистика:*\n` +
      `👥 Користувачів: ${totalUsers}\n` +
      `📅 Запущено: Листопад 2024\n` +
      `🔄 Оновлено: 20.11.2024\n\n` +
      `💾 *Джерела даних:*\n` +
      `• vyshgorod.in.ua - новини та графіки\n` +
      `• alerts.in.ua - повітряні тривоги\n` +
      `• wttr.in - погода\n\n` +
      `📬 *Зворотній зв'язок:*\n` +
      `Виявили помилку? Є пропозиції?\n` +
      `Напишіть нам: @vyshgorod_support\n\n` +
      `💙💛 Слава Україні!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Queue selection
  bot.onText(/\/queue/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Оберіть вашу групу відключень:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Група 1.1', callback_data: 'queue_1.1' }, { text: 'Група 1.2', callback_data: 'queue_1.2' }],
          [{ text: 'Група 1.4', callback_data: 'queue_1.4' }, { text: 'Група 2.1', callback_data: 'queue_2.1' }],
          [{ text: 'Група 6.2', callback_data: 'queue_6.2' }]
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

      const nextBlackout = getNextBlackout(queueNum);
      const schedule = formatSchedule(queueNum);

      bot.sendMessage(chatId,
        `✅ Ви обрали групу ${queueNum}\n\n` +
        `📋 Графік відключень:\n${schedule}\n\n` +
        (nextBlackout ? `⏰ Наступне відключення: ${nextBlackout}` : `✅ Зараз світло є`)
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
        `✅ Сповіщення ${newState ? 'увімкнені' : 'вимкнені'}\n\n` +
        (newState ? `Ви отримуватимете сповіщення за 30 хвилин до відключення світла 🔔` : `Сповіщення про відключення вимкнено`)
      );
    }
  });

  // Keyboard button handlers
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📰 Новини') {
      try {
        const loadingMsg = await bot.sendMessage(chatId, '📰 Завантажую останні новини...');
        const { fetchNews } = await import('./parsers.js');
        const articles = await fetchNews();

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (articles.length === 0) {
          bot.sendMessage(chatId, '❌ Не вдалося завантажити новини. Спробуйте пізніше.');
          return;
        }

        // Формуємо одне повідомлення з усіма новинами
        let newsMessage = `📰 *Останні новини Вишгорода*\n${new Date().toLocaleDateString('uk-UA')}\n\n`;

        articles.slice(0, 5).forEach((article, index) => {
          newsMessage += `${index + 1}. *${article.title}*\n`;
          if (article.excerpt) {
            newsMessage += `${article.excerpt.substring(0, 150)}...\n`;
          }
          newsMessage += `[Читати →](${article.link})\n\n`;
        });

        newsMessage += `📱 Більше новин на [vyshgorod.in.ua](https://vyshgorod.in.ua)`;

        bot.sendMessage(chatId, newsMessage, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      } catch (error) {
        console.error('Error fetching news:', error);
        bot.sendMessage(chatId, '❌ Помилка завантаження новин. Спробуйте пізніше.');
      }
    }

    if (text === '🔌 Графік відключень') {
      const user = queries.getUser.get(chatId);
      if (user?.queue_number) {
        const schedule = formatSchedule(user.queue_number);
        const nextBlackout = getNextBlackout(user.queue_number);
        const status = isBlackoutNow(user.queue_number);

        bot.sendMessage(chatId,
          `🔌 *Графік відключень для групи ${user.queue_number}*\n\n` +
          `${status ? '🔴 Зараз відключено' : '🟢 Зараз світло є'}\n\n` +
          `📋 Графік на сьогодні:\n${schedule}\n\n` +
          (nextBlackout ? `⏰ Наступне відключення:\n${nextBlackout}\n\n` : '') +
          `⚠️ _Графік може змінюватись. Актуальну інформацію дивіться на_ [vyshgorod.in.ua/svitlo](https://vyshgorod.in.ua/svitlo)`,
          { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
      } else {
        bot.sendMessage(chatId,
          '❌ Спочатку оберіть групу командою /queue\n\n' +
          'Не знаєте свою групу? Перевірте на [vyshgorod.in.ua/svitlo](https://vyshgorod.in.ua/svitlo)',
          { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
      }
    }

    if (text === '🚨 Тривоги') {
      try {
        const loadingMsg = await bot.sendMessage(chatId, '🚨 Перевіряю стан тривоги...');
        const { checkAlerts } = await import('./parsers.js');
        const alertStatus = await checkAlerts();

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (alertStatus.active) {
          const alertType = config.alertTypes[alertStatus.type] || '🚨 ТРИВОГА';
          const startTime = alertStatus.startedAt ? new Date(alertStatus.startedAt).toLocaleTimeString('uk-UA') : 'невідомо';

          bot.sendMessage(chatId,
            `${alertType}\n\n` +
            `📍 Вишгородський район\n` +
            `🔴 Статус: *АКТИВНА*\n` +
            `⏰ Початок: ${startTime}\n\n` +
            `⚠️ Негайно пройдіть до укриття!\n` +
            `🙏 Будьте в безпеці!`,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(chatId,
            `✅ *Тривог немає*\n\n` +
            `📍 Вишгородський район\n` +
            `🟢 Статус: СПОКІЙНО\n\n` +
            `Оновлено: ${new Date().toLocaleTimeString('uk-UA')}`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
        bot.sendMessage(chatId, '❌ Помилка перевірки тривог. Спробуйте пізніше.');
      }
    }

    if (text === '🌤 Погода') {
      try {
        const loadingMsg = await bot.sendMessage(chatId, '🌤 Завантажую прогноз погоди...');
        const { getWeather } = await import('./parsers.js');
        const weather = await getWeather();

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (weather) {
          const tempEmoji = weather.temp > 20 ? '🌡' : weather.temp > 10 ? '🌡' : '❄️';
          const windEmoji = weather.windSpeed > 20 ? '💨💨' : '💨';

          bot.sendMessage(chatId,
            `🌤 *Погода у Вишгороді*\n\n` +
            `${tempEmoji} Температура: *${weather.temp}°C*\n` +
            `🌡 Відчувається: ${weather.feelsLike}°C\n` +
            `☁️ ${weather.description}\n` +
            `💧 Вологість: ${weather.humidity}%\n` +
            `${windEmoji} Вітер: ${weather.windSpeed} км/год\n\n` +
            `🕐 Оновлено: ${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          bot.sendMessage(chatId, '❌ Не вдалося завантажити погоду. Спробуйте пізніше.');
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        bot.sendMessage(chatId, '❌ Помилка завантаження погоди.');
      }
    }

    if (text === '🚌 Розклад маршруток') {
      bot.sendMessage(chatId,
        `🚌 *Розклад маршруток та автобусів*\n\n` +
        `📍 *Доступні маршрути:*\n` +
        `• Міський маршрут Вишгород\n` +
        `• Вишгород ↔ Київ\n` +
        `• Вишгород ↔ Димер\n` +
        `• Вишгород ↔ Лютіж\n` +
        `• Вишгород ↔ Катюжанка\n` +
        `• Почайна ↔ Карат\n\n` +
        `[📱 Переглянути повний розклад →](https://vyshgorod.in.ua/novini/10825-grafik-ruhu-avtobusiv-miskyj-vyshgorod-pochajna-karat-kyyiv-dymer-lyutizh-katyuzhanka)\n\n` +
        `💡 _Збережіть посилання для швидкого доступу_`,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        }
      );
    }

    if (text === '🆘 Контакти') {
      bot.sendMessage(chatId,
        `🆘 *Екстрені контакти та служби*\n\n` +
        `🚨 *Екстрені служби:*\n` +
        `• 102 - Поліція\n` +
        `• 103 - Швидка допомога\n` +
        `• 101 - Пожежна служба\n` +
        `• 104 - Газова служба\n` +
        `• 112 - Єдиний номер екстрених служб\n\n` +
        `🏛 *Вишгородська міська рада:*\n` +
        `• ☎️ +38 (04596) 3-31-47\n` +
        `• 📧 vyshgorad@kmoda.gov.ua\n\n` +
        `💡 *Електропостачання (ДТЕК):*\n` +
        `• ☎️ 0 800 50 54 52\n\n` +
        `💧 *Водоканал:*\n` +
        `• ☎️ +38 (04596) 3-32-57\n\n` +
        `🔥 *Теплопостачання:*\n` +
        `• ☎️ +38 (04596) 3-31-22\n\n` +
        `⚠️ _Зберігайте ці номери для екстрених випадків!_`,
        { parse_mode: 'Markdown' }
      );
    }

    if (text === '📍 Корисні посилання') {
      bot.sendMessage(chatId,
        `📍 *Корисні ресурси Вишгорода*\n\n` +
        `🌐 *Офіційні сайти:*\n` +
        `• [Вишгород ONLINE](https://vyshgorod.in.ua) - новини та події\n` +
        `• [Вишгородська міськрада](https://vyshgorod-rada.gov.ua)\n\n` +
        `💡 *Графіки та послуги:*\n` +
        `• [Графіки відключень](https://vyshgorod.in.ua/svitlo)\n` +
        `• [Розклад транспорту](https://vyshgorod.in.ua/novini/10825-grafik-ruhu-avtobusiv-miskyj-vyshgorod-pochajna-karat-kyyiv-dymer-lyutizh-katyuzhanka)\n\n` +
        `🆘 *Допомога:*\n` +
        `• [Пункти незламності](https://vyshgorod.in.ua/punkty-nezlamnosti)\n\n` +
        `💡 _Додайте цей бот до закладок для швидкого доступу до інформації!_`,
        { parse_mode: 'Markdown', disable_web_page_preview: true }
      );
    }

    if (text === '⚙️ Налаштування') {
      const user = queries.getUser.get(chatId);
      const notifStatus = user?.notifications_enabled ? 'Увімкнені ✅' : 'Вимкнені ❌';
      const queueStatus = user?.queue_number || 'Не обрано';

      bot.sendMessage(chatId,
        `⚙️ *Налаштування профілю*\n\n` +
        `👤 Користувач: ${msg.from.first_name}\n` +
        `🔌 Група відключень: *${queueStatus}*\n` +
        `🔔 Сповіщення: ${notifStatus}\n\n` +
        `💡 Використовуйте /queue для зміни групи`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: user?.notifications_enabled ? '🔕 Вимкнути сповіщення' : '🔔 Увімкнути сповіщення',
                 callback_data: 'toggle_notif' }],
              [{ text: '🔌 Змінити групу', callback_data: 'change_queue' }]
            ]
          }
        }
      );
    }
  });

  // Handle "change_queue" callback
  bot.on('callback_query', async (query) => {
    if (query.data === 'change_queue') {
      bot.answerCallbackQuery(query.id);
      const chatId = query.message.chat.id;
      bot.sendMessage(chatId, 'Оберіть вашу групу відключень:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Група 1.1', callback_data: 'queue_1.1' }, { text: 'Група 1.2', callback_data: 'queue_1.2' }],
            [{ text: 'Група 1.4', callback_data: 'queue_1.4' }, { text: 'Група 2.1', callback_data: 'queue_2.1' }],
            [{ text: 'Група 6.2', callback_data: 'queue_6.2' }]
          ]
        }
      });
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

function getNextBlackout(queueNum) {
  const schedule = config.blackoutSchedules[queueNum];
  if (!schedule) return null;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const slot of schedule) {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const startTime = startHour * 60 + startMin;

    if (currentTime < startTime) {
      const minutesUntil = startTime - currentTime;
      const hours = Math.floor(minutesUntil / 60);
      const minutes = minutesUntil % 60;

      if (hours > 0) {
        return `через ${hours} год ${minutes} хв (о ${slot.start})`;
      } else {
        return `через ${minutes} хв (о ${slot.start})`;
      }
    }
  }

  // If no more today, show first tomorrow
  if (schedule.length > 0) {
    return `завтра о ${schedule[0].start}`;
  }

  return null;
}

function isBlackoutNow(queueNum) {
  const schedule = config.blackoutSchedules[queueNum];
  if (!schedule) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const slot of schedule) {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    let endTime = endHour * 60 + endMin;

    // Handle overnight slots
    if (endTime < startTime) {
      endTime += 24 * 60;
    }

    if (currentTime >= startTime && currentTime <= endTime) {
      return true;
    }
  }

  return false;
}
