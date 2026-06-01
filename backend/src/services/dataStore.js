/**
 * 💾 OFFLINE DATA STORAGE
 * JSON-based persistence for offline-first operation
 * No database required - works perfectly standalone
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Simple file-based data store
 */
export class DataStore {
  constructor(fileName) {
    this.filePath = path.join(DATA_DIR, `${fileName}.json`);
    ensureDataDir();
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error(`Error loading ${this.filePath}:`, err.message);
    }
    return {};
  }

  save() {
    try {
      ensureDataDir();
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`Error saving ${this.filePath}:`, err.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
    return value;
  }

  delete(key) {
    delete this.data[key];
    this.save();
  }

  keys() {
    return Object.keys(this.data);
  }

  values() {
    return Object.values(this.data);
  }

  all() {
    return this.data;
  }

  clear() {
    this.data = {};
    this.save();
  }
}

/**
 * Array-based data store (for lists like jobs, leads)
 */
export class DataList {
  constructor(fileName) {
    this.filePath = path.join(DATA_DIR, `${fileName}.json`);
    ensureDataDir();
    this.items = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content) || [];
      }
    } catch (err) {
      console.error(`Error loading ${this.filePath}:`, err.message);
    }
    return [];
  }

  save() {
    try {
      ensureDataDir();
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.items, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`Error saving ${this.filePath}:`, err.message);
    }
  }

  add(item) {
    // Add timestamp if not present
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    this.items.unshift(item);
    this.save();
    return item;
  }

  findById(id) {
    return this.items.find(item => item.id === id);
  }

  findOne(filter) {
    return this.items.find(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) return false;
      }
      return true;
    });
  }

  find(filter) {
    return this.items.filter(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) return false;
      }
      return true;
    });
  }

  update(id, updates) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.items[index];
    }
    return null;
  }

  delete(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      const deleted = this.items.splice(index, 1);
      this.save();
      return deleted[0];
    }
    return null;
  }

  all() {
    return this.items;
  }

  count() {
    return this.items.length;
  }

  clear() {
    this.items = [];
    this.save();
  }
}

// Initialize data stores
export const leads = new DataList('leads');
export const jobs = new DataList('jobs');
export const outreachLogs = new DataList('outreach_logs');
export const userSettings = new DataStore('user_settings');
export const emailCache = new DataStore('email_cache');

/**
 * Export data in batch format (for analytics/revenue features)
 */
export function exportDataAsCSV(dataList, fileName) {
  try {
    if (dataList.all().length === 0) {
      return 'No data to export';
    }

    const items = dataList.all();
    const headers = Object.keys(items[0]);
    const rows = items.map(item =>
      headers.map(header => {
        const value = item[header];
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      })
    );

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const filePath = path.join(DATA_DIR, `${fileName}.csv`);
    fs.writeFileSync(filePath, csv, 'utf-8');
    
    return filePath;
  } catch (err) {
    console.error('CSV export error:', err.message);
    return null;
  }
}

/**
 * Get data analytics (for revenue potential)
 */
export function getAnalytics() {
  return {
    totalLeads: leads.count(),
    totalJobs: jobs.count(),
    totalOutreach: outreachLogs.count(),
    successfulOutreach: outreachLogs.find({ status: 'success' }).length,
    emailsCached: emailCache.keys().length,
    lastSync: new Date().toISOString(),
  };
}

export default {
  DataStore,
  DataList,
  leads,
  jobs,
  outreachLogs,
  userSettings,
  emailCache,
  exportDataAsCSV,
  getAnalytics,
};
