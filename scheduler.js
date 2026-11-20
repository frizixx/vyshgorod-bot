import cron from 'node-cron';
import { fetchNews, checkAlerts, getWeather, fetchBlackoutSchedules } from './parsers.js';
import { queries } from './db.js';
import { config } from './config.js';

export function setupSchedulers(bot) {
  // Check news every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Checking for new articles...');
    const articles = await fetchNews();

    for (const article of articles) {
      const alreadySent = queries.isNewsSent.get(article.link);
      if (!alreadySent) {
        const users = queries.getAllUsers.all();

        for (const user of users) {
          try {
            await bot.sendMessage(user.chat_id,
              `📰 *Нова новина*\n\n` +
              `*${article.title}*\n\n` +
              `${article.excerpt}\n\n` +
              `[Читати повністю](${article.link})`,
              { parse_mode: 'Markdown' }
            );
          } catch (error) {
            console.error(`Failed to send news to ${user.chat_id}:`, error.message);
          }
        }

        queries.markNewsSent.run(article.link, article.title);
      }
    }
  });

  // Check alerts every minute
  cron.schedule('* * * * *', async () => {
    const alertStatus = await checkAlerts();
    const activeAlert = queries.getActiveAlert.get();

    if (alertStatus.active && !activeAlert) {
      // New alert started
      const alertId = queries.addAlert.run(alertStatus.type, new Date().toISOString()).lastInsertRowid;

      const alertType = config.alertTypes[alertStatus.type] || '🚨 ПОВІТРЯНА ТРИВОГА';
      const users = queries.getAllUsers.all();

      for (const user of users) {
        try {
          await bot.sendMessage(user.chat_id,
            `${alertType}\n\n` +
            `Вишгородський район\n` +
            `Час початку: ${new Date().toLocaleTimeString('uk-UA')}\n\n` +
            `Будьте в безпеці! 🙏`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Failed to send alert to ${user.chat_id}:`, error.message);
        }
      }
    } else if (!alertStatus.active && activeAlert) {
      // Alert ended
      queries.endAlert.run(new Date().toISOString(), activeAlert.id);

      const users = queries.getAllUsers.all();
      for (const user of users) {
        try {
          await bot.sendMessage(user.chat_id,
            `✅ *ВІДБІЙ ТРИВОГИ*\n\n` +
            `Вишгородський район\n` +
            `Час відбою: ${new Date().toLocaleTimeString('uk-UA')}`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Failed to send alert end to ${user.chat_id}:`, error.message);
        }
      }
    }
  });

  // Morning weather report at 7:00
  cron.schedule('0 7 * * *', async () => {
    console.log('Sending morning weather report...');
    const weather = await getWeather();

    if (weather) {
      const users = queries.getAllUsers.all();
      for (const user of users) {
        try {
          await bot.sendMessage(user.chat_id,
            `🌤 *Погода у Вишгороді*\n\n` +
            `🌡 Температура: ${weather.temp}°C (відчувається як ${weather.feelsLike}°C)\n` +
            `☁️ ${weather.description}\n` +
            `💧 Вологість: ${weather.humidity}%\n` +
            `💨 Вітер: ${weather.windSpeed} км/год\n\n` +
            `Гарного дня! ☀️`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error(`Failed to send weather to ${user.chat_id}:`, error.message);
        }
      }
    }
  });

  // Blackout reminders (30 min before each scheduled outage)
  cron.schedule('*/30 * * * *', async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const users = queries.getAllUsers.all();
    for (const user of users) {
      if (user.queue_number) {
        const schedule = config.blackoutSchedules[user.queue_number];

        if (schedule) {
          for (const slot of schedule) {
            const [startHour, startMinute] = slot.start.split(':').map(Number);

            // Calculate time difference in minutes
            let diffMinutes = (startHour * 60 + startMinute) - (currentHour * 60 + currentMinute);

            // Handle day wrap-around
            if (diffMinutes < 0) {
              diffMinutes += 24 * 60;
            }

            // Send reminder if blackout starts in 30 minutes (±5 min tolerance)
            if (diffMinutes >= 25 && diffMinutes <= 35) {
              try {
                await bot.sendMessage(user.chat_id,
                  `⚡️ *Нагадування*\n\n` +
                  `Через ~30 хвилин (о ${slot.start}) планове відключення електроенергії\n` +
                  `Група ${user.queue_number}\n` +
                  `Тривалість: ${slot.start} - ${slot.end}`,
                  { parse_mode: 'Markdown' }
                );
              } catch (error) {
                console.error(`Failed to send reminder to ${user.chat_id}:`, error.message);
              }
            }
          }
        }
      }
    }
  });

  // Check blackout schedule changes every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Checking for blackout schedule changes...');
    const newSchedules = await fetchBlackoutSchedules();

    if (newSchedules && Object.keys(newSchedules).length > 0) {
      const changedQueues = [];

      // Перевіряємо кожну групу на зміни
      for (const [queueNumber, newSlots] of Object.entries(newSchedules)) {
        const cached = queries.getScheduleCache.get(queueNumber);
        const newScheduleJson = JSON.stringify(newSlots);

        if (cached) {
          // Порівнюємо з кешем
          if (cached.schedule_json !== newScheduleJson) {
            changedQueues.push({
              queue: queueNumber,
              oldSchedule: JSON.parse(cached.schedule_json),
              newSchedule: newSlots
            });
            queries.saveScheduleCache.run(queueNumber, newScheduleJson);
          }
        } else {
          // Перший запуск - зберігаємо без сповіщення
          queries.saveScheduleCache.run(queueNumber, newScheduleJson);
        }
      }

      // Сповіщаємо користувачів про зміни
      if (changedQueues.length > 0) {
        console.log(`Schedule changes detected for queues: ${changedQueues.map(c => c.queue).join(', ')}`);

        const users = queries.getAllUsers.all();

        for (const change of changedQueues) {
          const affectedUsers = users.filter(u => u.queue_number === change.queue);

          // Формуємо повідомлення про зміни
          const oldTimes = change.oldSchedule.map(s => `${s.start}-${s.end}`).join(', ');
          const newTimes = change.newSchedule.map(s => `${s.start}-${s.end}`).join(', ');

          const message =
            `⚡️ *ЗМІНА ГРАФІКУ ВІДКЛЮЧЕНЬ*\n\n` +
            `Група: *${change.queue}*\n\n` +
            `❌ Старий графік:\n${change.oldSchedule.map(s => `⏰ ${s.start} - ${s.end}`).join('\n')}\n\n` +
            `✅ Новий графік:\n${change.newSchedule.map(s => `⏰ ${s.start} - ${s.end}`).join('\n')}\n\n` +
            `⚠️ Перевірте актуальну інформацію на [vyshgorod.in.ua/svitlo](https://vyshgorod.in.ua/svitlo)`;

          // Відправляємо тільки користувачам цієї групи
          for (const user of affectedUsers) {
            try {
              await bot.sendMessage(user.chat_id, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
              });
            } catch (error) {
              console.error(`Failed to send schedule change to ${user.chat_id}:`, error.message);
            }
          }

          // Також відправляємо загальне сповіщення всім (незалежно від групи)
          const generalUsers = users.filter(u => u.queue_number !== change.queue);
          const generalMessage =
            `📢 *Оновлення графіку*\n\n` +
            `Змінено графік відключень для групи *${change.queue}*\n\n` +
            `Якщо це ваша група - перевірте новий графік!\n\n` +
            `⚠️ Деталі на [vyshgorod.in.ua/svitlo](https://vyshgorod.in.ua/svitlo)`;

          for (const user of generalUsers) {
            try {
              await bot.sendMessage(user.chat_id, generalMessage, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
              });
            } catch (error) {
              console.error(`Failed to send general schedule update to ${user.chat_id}:`, error.message);
            }
          }
        }
      }
    }
  });

  console.log('Schedulers initialized ✓');
  console.log('- News check: every 30 minutes');
  console.log('- Alerts check: every minute');
  console.log('- Weather report: daily at 7:00');
  console.log('- Blackout reminders: 30 min before each slot');
  console.log('- Schedule changes: every 5 minutes');
}
