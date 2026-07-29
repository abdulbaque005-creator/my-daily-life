/**
 * KanbanDB - Client-Side IndexedDB & LocalStorage Persistence Manager
 */
class KanbanDB {
  constructor() {
    this.dbName = 'MyDailyLifeDB';
    this.dbVersion = 1;
    this.db = null;
    this.storageKey = 'kanban_pro_board_data';
    this.snapshotsKey = 'kanban_pro_snapshots';
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('columns')) {
          db.createObjectStore('columns', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('columnId', 'columnId', { unique: false });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(true);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB unavailable, using LocalStorage fallback.', e);
        resolve(false);
      };
    });
  }

  // Save current state to IndexedDB and LocalStorage
  async saveBoardState(columns, cards) {
    const data = { columns, cards, updatedAt: new Date().toISOString() };
    
    // Always sync with LocalStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }

    if (!this.db) return data;

    return new Promise((resolve) => {
      const tx = this.db.transaction(['columns', 'cards'], 'readwrite');
      const colStore = tx.objectStore('columns');
      const cardStore = tx.objectStore('cards');

      colStore.clear();
      cardStore.clear();

      columns.forEach(col => colStore.put(col));
      cards.forEach(card => cardStore.put(card));

      tx.oncomplete = () => resolve(data);
      tx.onerror = () => resolve(data);
    });
  }

  // Load state from IndexedDB or LocalStorage
  async loadBoardState() {
    let localData = null;
    try {
      const item = localStorage.getItem(this.storageKey);
      if (item) localData = JSON.parse(item);
    } catch (e) {
      console.error('LocalStorage read error', e);
    }

    if (localData && localData.columns && localData.cards) {
      return localData;
    }

    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db.transaction(['columns', 'cards'], 'readonly');
      const colStore = tx.objectStore('columns');
      const cardStore = tx.objectStore('cards');

      const colsReq = colStore.getAll();
      const cardsReq = cardStore.getAll();

      tx.oncomplete = () => {
        if (colsReq.result && colsReq.result.length > 0) {
          resolve({ columns: colsReq.result, cards: cardsReq.result || [] });
        } else {
          resolve(null);
        }
      };
      tx.onerror = () => resolve(null);
    });
  }

  // Create a manual snapshot backup in DB
  async saveSnapshot(columns, cards, name = 'Snapshot') {
    const snapshot = {
      id: 'snap_' + Date.now(),
      name: name + ' (' + new Date().toLocaleString() + ')',
      timestamp: new Date().toISOString(),
      columns,
      cards,
      cardCount: cards.length
    };

    let snapshots = this.getSnapshotsLocalStorage();
    snapshots.unshift(snapshot);
    if (snapshots.length > 10) snapshots = snapshots.slice(0, 10);
    localStorage.setItem(this.snapshotsKey, JSON.stringify(snapshots));

    return snapshot;
  }

  getSnapshotsLocalStorage() {
    try {
      const data = localStorage.getItem(this.snapshotsKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Export full DB as JSON file download
  exportJSON(columns, cards) {
    const backup = {
      app: 'My Daily Life',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      columns,
      cards
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-database-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const dbManager = new KanbanDB();
