# Вишгород Бот 🤖

Telegram бот для жителів Вишгорода з актуальною інформацією про відключення електроенергії, новини, повітряні тривоги та погоду.

## Функціонал

- 🔌 **Графіки відключень** - персональні сповіщення за 30 хв до відключення
- 📰 **Новини** - автоматичний парсинг з vyshgorod.in.ua кожні 30 хвилин
- 🚨 **Повітряні тривоги** - моментальні сповіщення про початок/відбій тривоги
- 🌤 **Погода** - щоденний ранковий прогноз о 7:00
- ⚙️ **Налаштування** - вибір черги відключень, керування сповіщеннями

## Встановлення

```bash
# Клонувати репозиторій
git clone <repo-url>
cd vyshgorod-bot

# Встановити залежності
npm install

# Створити .env файл
cp .env.example .env
# Додати BOT_TOKEN в .env

# Запустити бота
npm start
```

## Деплой на безкоштовний хостинг

### Railway.app (рекомендується)
1. Зареєструватися на [railway.app](https://railway.app)
2. Натиснути "New Project" → "Deploy from GitHub"
3. Вибрати репозиторій
4. Додати змінну `BOT_TOKEN` в Environment Variables
5. Deploy автоматично розгорнеться

### Render.com
1. Зареєструватися на [render.com](https://render.com)
2. New → Web Service
3. Підключити GitHub репозиторій
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Додати `BOT_TOKEN` в Environment

### Fly.io
```bash
# Встановити flyctl
curl -L https://fly.io/install.sh | sh

# Залогінитись
fly auth login

# Ініціалізувати проект
fly launch

# Встановити секрет
fly secrets set BOT_TOKEN=your_token_here

# Задеплоїти
fly deploy
```

## Налаштування

### API для тривог
Зареєструйтесь на [ukrainealarm.com](https://api.ukrainealarm.com/) та додайте ключ в `parsers.js:35`

Альтернатива - використання публічних джерел (fallback вже реалізовано).

### Графіки відключень
Оновіть графіки в `config.js` → `blackoutSchedules` згідно актуальної інформації від ДТЕК.

## Структура проекта

```
vyshgorod-bot/
├── index.js          # Entry point, health check server
├── bot.js            # Bot commands and handlers
├── scheduler.js      # Cron jobs for news, alerts, weather
├── parsers.js        # Web scraping and API calls
├── db.js             # SQLite database setup
├── config.js         # Configuration
└── package.json      # Dependencies
```

## Технології

- Node.js 18+
- node-telegram-bot-api
- Cheerio (web scraping)
- node-cron (scheduled tasks)
- better-sqlite3 (database)
- Axios (HTTP requests)

## Ліцензія

MIT
