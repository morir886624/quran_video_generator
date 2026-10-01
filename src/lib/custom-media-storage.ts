export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('QuranVideoStudioDB', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('customMedia')) {
        db.createObjectStore('customMedia');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeCustomMedia(file: File): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('customMedia', 'readwrite');
    const store = transaction.objectStore('customMedia');
    const request = store.put(file, 'user-background');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadCustomMedia(): Promise<File | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('customMedia', 'readonly');
    const store = transaction.objectStore('customMedia');
    const request = store.get('user-background');
    request.onsuccess = () => {
      resolve((request.result as File) || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearCustomMedia(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('customMedia', 'readwrite');
    const store = transaction.objectStore('customMedia');
    const request = store.delete('user-background');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

