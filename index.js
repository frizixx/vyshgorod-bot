import { createBot } from './bot.js';
import { setupSchedulers } from './scheduler.js';
import { config } from './config.js';

console.log('🤖 Starting Vyshgorod Bot...');

const bot = createBot();
setupSchedulers(bot);

// Health check endpoint for hosting platforms
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(config.port, () => {
  console.log(`✅ Bot is running`);
  console.log(`🌐 Health check available at http://localhost:${config.port}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  bot.stopPolling();
  server.close();
  process.exit(0);
});
