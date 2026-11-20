import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'bot.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing database or create new
  let buffer;
  try {
    buffer = fs.readFileSync(dbPath);
  } catch (e) {
    buffer = null;
  }

  db = new SQL.Database(buffer);

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      chat_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      queue_number TEXT,
      notifications_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      type TEXT,
      enabled INTEGER DEFAULT 1,
      FOREIGN KEY (chat_id) REFERENCES users(chat_id)
    );

    CREATE TABLE IF NOT EXISTS sent_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      title TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT,
      started_at DATETIME,
      ended_at DATETIME,
      notified INTEGER DEFAULT 0
    );
  `);

  return db;
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(dbPath, data);
}

// Auto-save every 5 seconds
setInterval(() => {
  if (db) saveDB();
}, 5000);

// Save on exit
process.on('exit', () => {
  if (db) saveDB();
});
process.on('SIGINT', () => {
  if (db) saveDB();
  process.exit();
});

await initDB();

export const queries = {
  // Users
  addUser: {
    run: (chatId, username, firstName, queueNumber) => {
      db.run('INSERT OR REPLACE INTO users (chat_id, username, first_name, queue_number) VALUES (?, ?, ?, ?)',
        [chatId, username, firstName, queueNumber]);
      saveDB();
    }
  },

  getUser: {
    get: (chatId) => {
      const stmt = db.prepare('SELECT * FROM users WHERE chat_id = ?');
      stmt.bind([chatId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return null;
    }
  },

  getAllUsers: {
    all: () => {
      const stmt = db.prepare('SELECT * FROM users WHERE notifications_enabled = 1');
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  },

  setUserQueue: {
    run: (queueNum, chatId) => {
      db.run('UPDATE users SET queue_number = ? WHERE chat_id = ?', [queueNum, chatId]);
      saveDB();
    }
  },

  toggleNotifications: {
    run: (enabled, chatId) => {
      db.run('UPDATE users SET notifications_enabled = ? WHERE chat_id = ?', [enabled, chatId]);
      saveDB();
    }
  },

  // Subscriptions
  addSubscription: {
    run: (chatId, type) => {
      db.run('INSERT OR IGNORE INTO subscriptions (chat_id, type) VALUES (?, ?)', [chatId, type]);
      saveDB();
    }
  },

  getSubscriptions: {
    all: (chatId) => {
      const stmt = db.prepare('SELECT type FROM subscriptions WHERE chat_id = ? AND enabled = 1');
      stmt.bind([chatId]);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  },

  // News tracking
  markNewsSent: {
    run: (url, title) => {
      try {
        db.run('INSERT OR IGNORE INTO sent_news (url, title) VALUES (?, ?)', [url, title]);
        saveDB();
      } catch (e) {
        // Ignore duplicates
      }
    }
  },

  isNewsSent: {
    get: (url) => {
      const stmt = db.prepare('SELECT 1 FROM sent_news WHERE url = ?');
      stmt.bind([url]);
      const result = stmt.step();
      stmt.free();
      return result;
    }
  },

  // Alert history
  addAlert: {
    run: (alertType, startedAt) => {
      db.run('INSERT INTO alert_history (alert_type, started_at) VALUES (?, ?)', [alertType, startedAt]);
      saveDB();
      const stmt = db.prepare('SELECT last_insert_rowid() as id');
      stmt.step();
      const result = stmt.getAsObject();
      stmt.free();
      return { lastInsertRowid: result.id };
    }
  },

  getActiveAlert: {
    get: () => {
      const stmt = db.prepare('SELECT * FROM alert_history WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return null;
    }
  },

  endAlert: {
    run: (endedAt, id) => {
      db.run('UPDATE alert_history SET ended_at = ? WHERE id = ?', [endedAt, id]);
      saveDB();
    }
  }
};

export default db;
