import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from './config.js';

export async function fetchNews() {
  try {
    const { data } = await axios.get(config.sources.news, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    const articles = [];

    // Parse news articles (adjust selectors based on actual site structure)
    $('.news-item, article, .post').slice(0, 5).each((i, elem) => {
      const title = $(elem).find('h2, h3, .title').text().trim();
      const link = $(elem).find('a').attr('href');
      const excerpt = $(elem).find('.excerpt, .summary, p').first().text().trim();

      if (title && link) {
        articles.push({
          title,
          link: link.startsWith('http') ? link : config.sources.news + link,
          excerpt: excerpt.substring(0, 200)
        });
      }
    });

    return articles;
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return [];
  }
}

export async function checkAlerts() {
  try {
    // Using Ukraine Alarm API (free, requires registration at https://api.ukrainealarm.com/)
    // Alternative: https://alerts.in.ua/api or parse from telegram channels
    const { data } = await axios.get('https://api.ukrainealarm.com/api/v3/alerts/31', {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY_HERE' // Register at ukrainealarm.com
      }
    });

    // Kyiv region ID is 31
    return {
      active: data?.length > 0,
      type: data?.[0]?.type || 'air',
      startedAt: data?.[0]?.startedAt
    };
  } catch (error) {
    console.error('Error checking alerts:', error.message);

    // Fallback: parse from public sources
    try {
      const { data } = await axios.get('https://alerts.in.ua/');
      const $ = cheerio.load(data);
      const kyivRegion = $('.region:contains("Київська")');
      const hasAlert = kyivRegion.find('.alert-active').length > 0;

      return {
        active: hasAlert,
        type: 'air',
        startedAt: new Date().toISOString()
      };
    } catch (fallbackError) {
      return { active: false, type: null, startedAt: null };
    }
  }
}

export async function getWeather() {
  try {
    const { data } = await axios.get(config.sources.weather);
    const current = data.current_condition[0];

    return {
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      description: current.lang_uk?.[0]?.value || current.weatherDesc[0].value,
      humidity: current.humidity,
      windSpeed: current.windspeedKmph
    };
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    return null;
  }
}
