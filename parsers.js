import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from './config.js';

// User agent для обходу блокировок
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://vyshgorod.in.ua/'
};

export async function fetchNews() {
  try {
    console.log('Fetching news from vyshgorod.in.ua...');
    const { data } = await axios.get(config.sources.news, { headers, timeout: 10000 });

    const $ = cheerio.load(data);
    const articles = [];

    // Пробуем разные селекторы для статей
    const selectors = [
      'article.post',
      '.post-item',
      '.news-item',
      'article',
      '.entry-content-wrap'
    ];

    let foundArticles = false;
    for (const selector of selectors) {
      const items = $(selector);
      if (items.length > 0) {
        console.log(`Found ${items.length} articles with selector: ${selector}`);

        items.slice(0, 5).each((i, elem) => {
          const $elem = $(elem);

          // Пробуем разные селекторы для заголовка
          let title = $elem.find('h1, h2, h3, .entry-title, .post-title').first().text().trim();

          // Пробуем разные селекторы для ссылки
          let link = $elem.find('a').first().attr('href');
          if (!link) {
            link = $elem.find('h1 a, h2 a, h3 a').first().attr('href');
          }

          // Пробуем разные селекторы для описания
          let excerpt = $elem.find('.entry-summary, .excerpt, p').first().text().trim();

          if (title && link) {
            // Делаем полный URL
            if (link && !link.startsWith('http')) {
              link = new URL(link, config.sources.news).href;
            }

            articles.push({
              title: title.substring(0, 200),
              link,
              excerpt: excerpt.substring(0, 300)
            });
          }
        });

        if (articles.length > 0) {
          foundArticles = true;
          break;
        }
      }
    }

    if (!foundArticles) {
      console.log('No articles found with standard selectors, trying alternative approach...');

      // Альтернативный подход - ищем все ссылки и фильтруем
      $('a').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        if (href && text.length > 20 &&
            (href.includes('/vyshgorod/') || href.includes('vyshgorod.in.ua')) &&
            !href.includes('/category/') &&
            !href.includes('/tag/') &&
            articles.length < 5) {

          const fullUrl = href.startsWith('http') ? href : new URL(href, config.sources.news).href;

          // Проверяем что такой ссылки еще нет
          if (!articles.some(a => a.link === fullUrl)) {
            articles.push({
              title: text.substring(0, 200),
              link: fullUrl,
              excerpt: ''
            });
          }
        }
      });
    }

    console.log(`Successfully fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return [];
  }
}

export async function checkAlerts() {
  try {
    console.log('Checking air raid alerts...');

    // Используем публичный API от alerts.in.ua
    const { data } = await axios.get('https://alerts.in.ua/api/states', {
      headers: { 'User-Agent': 'VyshgorodBot/1.0' },
      timeout: 5000
    });

    // Ищем Киевскую область
    const kyivRegion = data.states.find(s =>
      s.name.includes('Київська') ||
      s.name_en?.toLowerCase().includes('kyiv')
    );

    if (kyivRegion) {
      const isActive = kyivRegion.alert || false;
      const alertType = kyivRegion.alert_type || 'air'; // air, artillery, chemical, nuclear

      console.log(`Alert status for Kyiv region: ${isActive ? 'ACTIVE' : 'CLEAR'} (${alertType})`);

      return {
        active: isActive,
        type: alertType,
        startedAt: kyivRegion.changed ? new Date(kyivRegion.changed * 1000).toISOString() : new Date().toISOString()
      };
    }

    // Fallback - пробуем через украинскую тривогу
    try {
      const { data: alertData } = await axios.get('https://api.ukrainealarm.com/api/v3/alerts/31', {
        headers: {
          'Authorization': `Bearer ${config.alertsApiKey || ''}`
        },
        timeout: 5000
      });

      if (alertData && Array.isArray(alertData)) {
        const hasAlert = alertData.length > 0;
        return {
          active: hasAlert,
          type: alertData[0]?.type || 'air',
          startedAt: alertData[0]?.startedAt || new Date().toISOString()
        };
      }
    } catch (fallbackError) {
      console.log('Fallback alert API also failed, assuming no alert');
    }

    return { active: false, type: null, startedAt: null };
  } catch (error) {
    console.error('Error checking alerts:', error.message);
    return { active: false, type: null, startedAt: null };
  }
}

export async function getWeather() {
  try {
    console.log('Fetching weather for Vyshgorod...');

    // Используем wttr.in - бесплатный сервис погоды
    const { data } = await axios.get('https://wttr.in/Vyshgorod?format=j1&lang=uk', {
      timeout: 5000
    });

    const current = data.current_condition[0];
    const weatherDesc = data.current_condition[0].lang_uk?.[0]?.value ||
                        data.current_condition[0].weatherDesc[0].value;

    return {
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      description: weatherDesc,
      humidity: current.humidity,
      windSpeed: Math.round(current.windspeedKmph)
    };
  } catch (error) {
    console.error('Error fetching weather:', error.message);

    // Fallback - используем OpenMeteo (бесплатный, без ключа)
    try {
      const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: 50.5833, // Вышгород
          longitude: 30.4833,
          current_weather: true,
          timezone: 'Europe/Kiev'
        },
        timeout: 5000
      });

      const weather = data.current_weather;

      return {
        temp: Math.round(weather.temperature),
        feelsLike: Math.round(weather.temperature - (weather.windspeed / 10)), // Приблизительно
        description: getWeatherDescription(weather.weathercode),
        humidity: 'н/д',
        windSpeed: Math.round(weather.windspeed)
      };
    } catch (fallbackError) {
      console.error('Fallback weather API also failed');
      return null;
    }
  }
}

// Преобразование кодов погоды в описание
function getWeatherDescription(code) {
  const descriptions = {
    0: 'Ясно',
    1: 'Переважно ясно',
    2: 'Частково хмарно',
    3: 'Хмарно',
    45: 'Туман',
    48: 'Туман з ожеледицею',
    51: 'Легка мряка',
    53: 'Мряка',
    55: 'Сильна мряка',
    61: 'Невеликий дощ',
    63: 'Дощ',
    65: 'Сильний дощ',
    71: 'Невеликий сніг',
    73: 'Сніг',
    75: 'Сильний сніг',
    77: 'Снігова крупа',
    80: 'Злива',
    81: 'Сильна злива',
    85: 'Снігопад',
    95: 'Гроза',
    96: 'Гроза з градом'
  };

  return descriptions[code] || 'Невідомо';
}

// Функция для получения графиков отключений
export async function fetchBlackoutSchedules() {
  try {
    console.log('Fetching blackout schedules...');
    const { data } = await axios.get('https://vyshgorod.in.ua/svitlo', {
      headers,
      timeout: 10000
    });

    const $ = cheerio.load(data);

    // Здесь нужно будет распарсить реальную структуру графиков
    // Пока возвращаем заглушку - обновим после анализа страницы
    console.log('Blackout schedules page loaded, parsing...');

    return null;
  } catch (error) {
    console.error('Error fetching blackout schedules:', error.message);
    return null;
  }
}
