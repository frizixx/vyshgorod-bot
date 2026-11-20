# Деплой на Render.com (БЕЗ КАРТЫ)

## ✅ Что уже сделано

1. ✅ Fly.io остановлен (две машины удалены)
2. ✅ Создан `render.yaml` с конфигурацией
3. ✅ Изменения запушены в GitHub: https://github.com/frizixx/vyshgorod-bot

## 🚀 Как задеплоить на Render.com (5 минут)

### Шаг 1: Зарегистрироваться на Render.com

1. Открой https://dashboard.render.com/register
2. Выбери **Sign up with GitHub**
3. Авторизуй доступ к репозиториям

### Шаг 2: Создать новый Web Service

1. На дашборде нажми **"New +"** → **"Web Service"**
2. Найди репозиторий **frizixx/vyshgorod-bot** и нажми **"Connect"**
3. Render автоматически обнаружит `render.yaml` и заполнит настройки

### Шаг 3: Настроить переменные окружения

В разделе **Environment Variables** добавь:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | `ваш_telegram_bot_token` |
| `NODE_VERSION` | `18` |

**Где взять BOT_TOKEN?**
- Если забыл: напиши @BotFather в Telegram → `/token`
- Или проверь `.env` файл локально (НЕ ПУШЬ В GIT!)

### Шаг 4: Деплой

1. Нажми **"Create Web Service"**
2. Render автоматически:
   - Установит зависимости (`npm install`)
   - Запустит бота (`npm start`)
   - Создаст health check endpoint (`/health`)

**Деплой занимает ~2-3 минуты**

### Шаг 5: Проверка

После деплоя:
1. Открой свой бот в Telegram
2. Отправь `/start`
3. Должен ответить меню с кнопками

## 📊 Мониторинг

**Дашборд:** https://dashboard.render.com/web/

**Логи:** В дашборде → твой сервис → вкладка "Logs"

**Health check:** 
```
https://vyshgorod-bot.onrender.com/health
```

## ⚠️ Важно знать про бесплатный план Render.com

### Плюсы
- ✅ Полностью бесплатно
- ✅ Без кредитной карты
- ✅ 750 часов/месяц (достаточно для 1 бота 24/7)
- ✅ Автодеплой при push в GitHub
- ✅ SSL сертификат включён

### Минусы
- ⚠️ **Засыпает через 15 минут неактивности**
- ⚠️ Первый запрос после сна ~30 секунд (cold start)
- ⚠️ Shared CPU (медленнее чем Fly.io)

### Решение проблемы "засыпания"

**Вариант 1: UptimeRobot (рекомендуется)**
1. Зарегистрируйся на https://uptimerobot.com (бесплатно)
2. Add New Monitor → HTTP(s)
3. URL: `https://vyshgorod-bot.onrender.com/health`
4. Monitoring Interval: **5 minutes**

UptimeRobot будет пинговать бота каждые 5 минут → бот не заснёт.

**Вариант 2: Встроенный self-ping (уже в коде)**

Можно добавить в `scheduler.js`:
```javascript
// Keep Render.com awake
if (process.env.RENDER) {
  cron.schedule('*/10 * * * *', () => {
    fetch('https://vyshgorod-bot.onrender.com/health')
      .catch(err => console.log('Self-ping failed:', err));
  });
}
```

## 🔄 Автообновления

При каждом `git push origin main` Render автоматически:
1. Скачает новый код
2. Запустит `npm install`
3. Перезапустит бота

## 🐛 Troubleshooting

### Бот не отвечает
```bash
# Проверь логи
curl https://vyshgorod-bot.onrender.com/health

# Перезапусти вручную
# В дашборде: Manual Deploy → Deploy latest commit
```

### Ошибка "409 Conflict"
Означает что бот запущен в двух местах одновременно. Проверь:
- Fly.io остановлен? `fly status`
- Локально не запущен? `ps aux | grep "node index.js"`

### Не видит BOT_TOKEN
- Проверь Environment Variables в дашборде Render
- Перезапусти сервис после добавления переменной

## 📝 Что дальше?

После успешного деплоя:

1. **Настрой UptimeRobot** (чтобы бот не засыпал)
2. **Обнови графики отключений** в `config.js` → актуальные с vyshgorod.in.ua/svitlo
3. **Получи API ключ для тривог** на https://api.ukrainealarm.com/ (опционально)
4. **Протестируй все функции**:
   - `/start` - главное меню
   - `/news` - последние новости
   - `/weather` - прогноз погоды
   - `/alerts` - статус тревоги
   - `/schedule` - графики отключений
   - `/settings` - настройки уведомлений

## 🎯 Итог

**Бот будет работать 24/7 бесплатно:**
- Render.com хостинг (без карты)
- GitHub автодеплой
- UptimeRobot keep-alive
- SQLite база данных (сохраняется между деплоями)

---

**Нужна помощь?** Пиши мне в чат!

**Создано:** 2026-11-20 20:56
**Статус:** ✅ Готово к деплою
