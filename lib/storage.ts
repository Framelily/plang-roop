// IndexedDB storage utility for large image data
// sessionStorage has ~5-10MB limit, IndexedDB supports hundreds of MB

const DB_NAME = 'plang-roop-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface ImageStoreData {
  key: string;
  data: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export async function storeImageData(key: string, data: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const item: ImageStoreData = {
      key,
      data,
      timestamp: Date.now(),
    };

    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

export async function getImageData(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as ImageStoreData | undefined;
      resolve(result?.data ?? null);
    };

    transaction.oncomplete = () => db.close();
  });
}

export async function removeImageData(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

export async function clearAllImageData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

// Storage keys
export const STORAGE_KEYS = {
  PENDING_IMAGE_DATA: 'pendingImageData',
  BATCH_IMAGES: 'batchImages',
} as const;
