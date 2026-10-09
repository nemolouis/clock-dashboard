const DB_NAME = 'clock-dashboard'
const STORE = 'wallpaper'
const KEY = 'current'
const MAX_EDGE = 2560

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close()) as Promise<T>
}

export async function loadWallpaper(): Promise<Blob | null> {
  try {
    return (await withStore<Blob | undefined>('readonly', s => s.get(KEY))) ?? null
  }
  catch {
    return null
  }
}

export async function saveWallpaper(blob: Blob) {
  await withStore('readwrite', s => s.put(blob, KEY))
}

export async function clearWallpaper() {
  await withStore('readwrite', s => s.delete(KEY))
}

/** 缩放并压缩为 JPEG，避免超大图片占用过多存储与内存 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', 0.85)
  })
}
