import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../', config.databasePath);

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initializeDatabase() {
  try {
    // 1. Create Settings table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        sender_name TEXT,
        portfolio_url TEXT,
        github_url TEXT,
        resume_url TEXT,
        daily_limit INTEGER DEFAULT 15,
        target_keywords TEXT,
        default_template TEXT,
        gemini_api_key TEXT,
        google_places_api_key TEXT,
        groq_api_key TEXT,
        auto_apply INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dynamic schema migration: add google_places_api_key if not exists in existing databases
    try {
      await runAsync(`ALTER TABLE settings ADD COLUMN google_places_api_key TEXT`);
      console.log('Added google_places_api_key column to settings table.');
    } catch (err) {
      // Ignored if column already exists
    }

    // Dynamic schema migration: add groq_api_key if not exists in existing databases
    try {
      await runAsync(`ALTER TABLE settings ADD COLUMN groq_api_key TEXT`);
      console.log('Added groq_api_key column to settings table.');
    } catch (err) {
      // Ignored if column already exists
    }

    // 2. Create Jobs table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, -- Unique hash of URL or API id
        title TEXT,
        company TEXT,
        url TEXT,
        company_url TEXT,
        email TEXT,
        description TEXT,
        platform TEXT,
        posted_at TIMESTAMP,
        status TEXT DEFAULT 'pending', -- pending, applied, rejected, skipped
        customized_pitch TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dynamic schema migration: add company_url column to jobs table if it doesn't exist
    try {
      await runAsync(`ALTER TABLE jobs ADD COLUMN company_url TEXT`);
      console.log('Added company_url column to jobs table.');
    } catch (err) {
      // Ignored if column already exists
    }

    // Dynamic schema migration: add email column to jobs table if it doesn't exist
    try {
      await runAsync(`ALTER TABLE jobs ADD COLUMN email TEXT`);
      console.log('Added email column to jobs table.');
    } catch (err) {
      // Ignored if column already exists
    }


    // 3. Create Outreach Logs table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS outreach_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recipient_email TEXT,
        subject TEXT,
        body TEXT,
        status TEXT, -- success, failed
        error_message TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      )
    `);

    // 4. Create Local Leads table for B2B Maps Lead Finder
    await runAsync(`
      CREATE TABLE IF NOT EXISTS local_leads (
        id TEXT PRIMARY KEY,
        name TEXT,
        niche TEXT,
        location TEXT,
        website TEXT,
        phone TEXT,
        email TEXT,
        instagram_url TEXT,
        facebook_url TEXT,
        rating REAL,
        reviews_count INTEGER,
        status TEXT DEFAULT 'active',
        outreach_status TEXT DEFAULT 'pending', -- pending, emailed, skipped
        customized_pitch TEXT,
        needs_optimization INTEGER DEFAULT 0,
        optimization_reasons TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dynamic schema migration: add optimization columns if they don't exist
    try {
      await runAsync(`ALTER TABLE local_leads ADD COLUMN needs_optimization INTEGER DEFAULT 0`);
    } catch (err) {}
    try {
      await runAsync(`ALTER TABLE local_leads ADD COLUMN optimization_reasons TEXT`);
    } catch (err) {}

    // 4. Pre-populate Settings with Ahtasham's details if empty
    const settingsCount = await getAsync('SELECT COUNT(*) as count FROM settings');
    if (settingsCount.count === 0) {
      const defaultTemplate = `Hi,

I hope you are doing well.

I came across your posting for {job_title} at {company} and noticed you are looking for a developer with skills matching my stack.

I am a Full Stack Developer specializing in WordPress, React, HTML, CSS, JavaScript (JS), Node.js, and Flutter. I have built several high-performance web applications and websites. You can review my work at:
- Portfolio: https://ahtashamfarooq.netlify.app/
- GitHub: https://github.com/ahtashamfarooq193-pixel
- Resume: https://ahtashamfarooq.framer.website/

I would love to help you build and scale your project. Are you available for a brief call to discuss how we can work together?

Best regards,
Ahtasham Farooq`;

      await runAsync(`
        INSERT INTO settings (
          smtp_host, smtp_port, smtp_user, smtp_pass, sender_name,
          portfolio_url, github_url, resume_url, daily_limit,
          target_keywords, default_template, gemini_api_key, auto_apply
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'smtp.gmail.com', 465, '', '', 'Ahtasham Farooq',
        'https://ahtashamfarooq.netlify.app/',
        'https://github.com/ahtashamfarooq193-pixel',
        'https://ahtashamfarooq.framer.website/',
        30,
        'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter',
        defaultTemplate,
        '',
        0
      ]);
      console.log('Pre-populated settings with default Ahtasham Farooq data.');
    }
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

export const dbService = {
  db,
  run: runAsync,
  get: getAsync,
  all: allAsync,
  getSettings: async () => {
    return await getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
  },
  saveSettings: async (settings) => {
    const current = await dbService.getSettings();
    if (!current) {
      return await runAsync(`
        INSERT INTO settings (
          smtp_host, smtp_port, smtp_user, smtp_pass, sender_name,
          portfolio_url, github_url, resume_url, daily_limit,
          target_keywords, default_template, gemini_api_key, google_places_api_key, groq_api_key, auto_apply
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_pass, settings.sender_name,
        settings.portfolio_url, settings.github_url, settings.resume_url, settings.daily_limit,
        settings.target_keywords, settings.default_template, settings.gemini_api_key, settings.google_places_api_key, settings.groq_api_key, settings.auto_apply
      ]);
    } else {
      return await runAsync(`
        UPDATE settings SET
          smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, sender_name = ?,
          portfolio_url = ?, github_url = ?, resume_url = ?, daily_limit = ?,
          target_keywords = ?, default_template = ?, gemini_api_key = ?, google_places_api_key = ?, groq_api_key = ?, auto_apply = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_pass, settings.sender_name,
        settings.portfolio_url, settings.github_url, settings.resume_url, settings.daily_limit,
        settings.target_keywords, settings.default_template, settings.gemini_api_key, settings.google_places_api_key, settings.groq_api_key, settings.auto_apply,
        current.id
      ]);
    }
  }
};
