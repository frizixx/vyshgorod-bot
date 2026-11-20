# Деплой на Railway.app

## Шаг 1: Подготовка репозитория

```bash
# Инициализировать git
git init
git add .
git commit -m "Initial commit: Vyshgorod bot"

# Создать репозиторий на GitHub
# Перейти на github.com → New repository → vyshgorod-bot

# Подключить удалённый репозиторий
git remote add origin https://github.com/YOUR_USERNAME/vyshgorod-bot.git
git branch -M main
git push -u origin main
```

## Шаг 2: Деплой на Railway

1. Зайти на [railway.app](https://railway.app) и залогиниться через GitHub
2. Нажать **"New Project"**
3. Выбрать **"Deploy from GitHub repo"**
4. Выбрать репозиторий `vyshgorod-bot`
5. Railway автоматически обнаружит Node.js проект

## Шаг 3: Настроить переменные окружения

В панели Railway:
1. Открыть вкладку **Variables**
2. Добавить:
   ```
   BOT_TOKEN=9208357626:AAF3vLUONY_AMVGIRfrSXdoQxVLwpg9ry_g
   ```

## Шаг 4: Готово!

Railway автоматически:
- Установит зависимости (`npm install`)
- Запустит бота (`npm start`)
- Будет держать его 24/7

## Логи

Смотреть логи в реальном времени в панели Railway → Deploy → Logs

## Альтернатива: Render.com

Если Railway не работает:

1. Зайти на [render.com](https://render.com)
2. **New** → **Web Service**
3. Подключить GitHub репозиторий
4. Настройки:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Добавить `BOT_TOKEN` в Environment variables

## Проверка работы

Открыть Telegram → найти бота → `/start`

Должно прийти приветственное сообщение с кнопками.
