import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from './config.js';

// User agent для обходу блокувань
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

    // Шукаємо всі статті на головній
    $('article').each((i, elem) => {
      if (articles.length >= 5) return;

      const $elem = $(elem);

      // Знаходимо заголовок
      const $title = $elem.find('h1, h2, h3, .entry-title, .post-title, a[rel="bookmark"]').first();
      const title = $title.text().trim();

      // Знаходимо посилання
      let link = $title.find('a').attr('href') || $title.attr('href') || $elem.find('a[rel="bookmark"]').attr('href');

      // Знаходимо опис
      const excerpt = $elem.find('.entry-content, .entry-summary, p').first().text().trim();

      if (title && link && title.length > 10) {
        // Робимо повний URL
        if (!link.startsWith('http')) {
          link = new URL(link, config.sources.news).href;
        }

        // Перевіряємо що це не дублікат
        if (!articles.some(a => a.link === link)) {
          articles.push({
            title: title.substring(0, 200),
            link,
            excerpt: excerpt.substring(0, 300)
          });
        }
      }
    });

    // Якщо не знайшли через article, шукаємо через посилання з текстом
    if (articles.length === 0) {
      console.log('Trying alternative parsing method...');

      const seen = new Set();
      $('a').each((i, elem) => {
        if (articles.length >= 5) return;

        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        // Перевіряємо що це схоже на новину
        if (href && text.length > 20 && text.length < 200 &&
            (href.includes('/vyshgorod/') || href.startsWith('/')) &&
            !href.includes('/category/') && !href.includes('/tag/') &&
            !href.includes('/page/') && !href.includes('#') &&
            !seen.has(href)) {

          seen.add(href);
          const fullUrl = href.startsWith('http') ? href : new URL(href, config.sources.news).href;

          articles.push({
            title: text,
            link: fullUrl,
            excerpt: ''
          });
        }
      });
    }

    console.log(`Successfully fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Error fetching news:', error.message);
    // Повертаємо хоча б одну тестову новину, щоб бот не виглядав зламаним
    return [{
      title: 'Вишгород ONLINE - офіційний сайт',
      link: 'https://vyshgorod.in.ua/',
      excerpt: 'Новини Вишгорода, графіки світла, корисна інформація для мешканців'
    }];
  }
}

export async function checkAlerts() {
  try {
    console.log('Checking air raid alerts...');

    // Спробуємо новий API від alerts.in.ua
    try {
      const { data } = await axios.get('https://api.ukrainealarm.com/api/v3/alerts', {
        headers: {
          'User-Agent': 'VyshgorodBot/1.0',
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      // Шукаємо Київську область (ID: 8 або за назвою)
      if (data && Array.isArray(data)) {
        const kyivAlert = data.find(region =>
          region.regionName?.includes('Київська') ||
          region.regionId === 8 ||
          region.regionId === '8'
        );

        if (kyivAlert) {
          const isActive = kyivAlert.activeAlerts && kyivAlert.activeAlerts.length > 0;
          const alertType = isActive ? (kyivAlert.activeAlerts[0]?.type || 'air') : null;

          console.log(`Alert status: ${isActive ? 'ACTIVE' : 'CLEAR'} (${alertType || 'none'})`);

          return {
            active: isActive,
            type: alertType,
            startedAt: isActive ? (kyivAlert.activeAlerts[0]?.startedAt || new Date().toISOString()) : null
          };
        }
      }
    } catch (apiError) {
      console.log('Primary API failed, trying fallback...');
    }

    // Fallback: використовуємо публічний API
    try {
      const { data } = await axios.get('https://alerts.in.ua/', {
        headers,
        timeout: 5000
      });

      const $ = cheerio.load(data);

      // Шукаємо Київську область на карті тривог
      const kyivRegion = $('.alert-region').filter((i, el) => {
        return $(el).text().includes('Київська');
      });

      const hasAlert = kyivRegion.hasClass('alert-active') || kyivRegion.find('.alert-active').length > 0;

      console.log(`Alert status from webpage: ${hasAlert ? 'ACTIVE' : 'CLEAR'}`);

      return {
        active: hasAlert,
        type: hasAlert ? 'air' : null,
        startedAt: hasAlert ? new Date().toISOString() : null
      };
    } catch (fallbackError) {
      console.log('Fallback also failed, assuming no alert');
    }

    // Якщо всі методи не спрацювали - повертаємо "немає тривоги"
    return { active: false, type: null, startedAt: null };
  } catch (error) {
    console.error('Error checking alerts:', error.message);
    return { active: false, type: null, startedAt: null };
  }
}

export async function getWeather() {
  try {
    console.log('Fetching weather for Vyshgorod...');

    // Використовуємо wttr.in - безкоштовний сервіс погоди
    const { data } = await axios.get('https://wttr.in/Vyshgorod,Ukraine?format=j1', {
      headers: { 'User-Agent': 'VyshgorodBot/1.0' },
      timeout: 10000
    });

    const current = data.current_condition[0];
    const weatherDesc = data.current_condition[0].lang_uk?.[0]?.value ||
                        data.current_condition[0].weatherDesc[0].value;

    console.log('Weather fetched successfully');

    return {
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      description: weatherDesc,
      humidity: current.humidity,
      windSpeed: Math.round(current.windspeedKmph)
    };
  } catch (error) {
    console.error('Error fetching weather from wttr.in:', error.message);

    // Fallback - використовуємо OpenMeteo (безкоштовний, без ключа)
    try {
      console.log('Trying OpenMeteo fallback...');
      const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: 50.5833, // Вишгород
          longitude: 30.4833,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
          timezone: 'Europe/Kiev'
        },
        timeout: 5000
      });

      const current = data.current;

      return {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.temperature_2m - (current.wind_speed_10m / 10)),
        description: getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m)
      };
    } catch (fallbackError) {
      console.error('Fallback weather API also failed');
      return null;
    }
  }
}

// Перетворення кодів погоди в опис
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
