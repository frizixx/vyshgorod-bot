# Деплой на бесплатный хостинг БЕЗ КАРТЫ

## ✅ Лучший вариант: Render.com

**Преимущества:**
- Полностью бесплатный без карты
- 750 часов/месяц (достаточно для 24/7)
- Автоматический деплой из GitHub
- Простая настройка

### Шаг 1: Создать репозиторий на GitHub

1. Зайти на [github.com](https://github.com) → залогиниться
2. Нажать **"New repository"** (зелёная кнопка справа вверху)
3. Название: `vyshgorod-bot`
4. Сделать **Public** (для бесплатного хостинга)
5. Нажать **"Create repository"**

### Шаг 2: Запушить код

Скопируй команды, которые GitHub покажет в разделе "…or push an existing repository":

```bash
git remote add origin https://github.com/YOUR_USERNAME/vyshgorod-bot.git
git branch -M main
git push -u origin main
```

**ВАЖНО:** Замени `YOUR_USERNAME` на свой логин GitHub!

### Шаг 3: Деплой на Render.com

1. Зайти на [render.com](https://render.com)
2. Нажать **"Sign Up"** → войти через GitHub (не требует карты!)
3. Нажать **"New +"** → **"Web Service"**
4. Подключить GitHub репозиторий `vyshgorod-bot`
5. Настройки:
   - **Name:** `vyshgorod-bot`
   - **Region:** Frankfurt (ближе к Украине)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free** ✅
6. Нажать **"Advanced"** → добавить Environment Variable:
   - **Key:** `BOT_TOKEN`
   - **Value:** `9208357626:AAF3vLUONY_AMVGIRfrSXdoQxVLwpg9ry_g`
7. Нажать **"Create Web Service"**

### Шаг 4: Готово! 🎉

Render начнёт деплой. Через 2-3 минуты бот будет работать 24/7!

**Проверка:** Открой Telegram → найди бота → `/start`

---

## Альтернативы БЕЗ КАРТЫ:

### 2. Glitch.com
- 1000 часов/месяц бесплатно
- Нужно создать проект через интерфейс и импортировать из GitHub
- [glitch.com](https://glitch.com)

### 3. Fly.io
- Бесплатный tier БЕЗ карты
- Через CLI:
```bash
# Установить flyctl
curl -L https://fly.io/install.sh | sh

# Залогиниться
fly auth login

# Запустить проект
fly launch --no-deploy

# Установить токен
fly secrets set BOT_TOKEN=9208357626:AAF3vLUONY_AMVGIRfrSXdoQxVLwpg9ry_g

# Задеплоить
fly deploy
```

### 4. Koyeb.com
- 512MB RAM бесплатно без карты
- Деплой из GitHub
- [koyeb.com](https://koyeb.com)

---

## Проверка работы

После деплоя:
1. В Telegram найди бота по юзернейму (узнай у @BotFather)
2. Отправь `/start`
3. Выбери чергу відключень
4. Бот должен отвечать!

## Логи

Смотреть логи:
- **Render:** Dashboard → Logs (обновляются в реальном времени)
- **Fly.io:** `fly logs`
- **Glitch:** Console в редакторе

## Если что-то не работает

Проверь логи на хостинге. Частые проблемы:
- Неправильный `BOT_TOKEN` 
- Нужно добавить `PORT` переменную (должно быть автоматически)
- SQLite база не сохраняется - это нормально на ephemeral хостинге, при рестарте создастся заново

---

**Рекомендация:** Используй **Render.com** - самый простой и стабильный вариант без карты.
