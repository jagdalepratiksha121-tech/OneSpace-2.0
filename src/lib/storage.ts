import type {
  LocalAuthAccount,
  UserProfile,
  UserWorkspaceData,
} from '../types/onespace';

const ACCOUNTS_KEY = 'onespace_v2_accounts';
const SESSION_KEY = 'onespace_v2_session_user_id';
const PROFILE_PREFIX = 'onespace_v2_profile_';
const WORKSPACE_PREFIX = 'onespace_v2_workspace_';
const BLOB_DB_NAME = 'OneSpace2_FileStore';
const BLOB_STORE_NAME = 'files';

export function createEmptyWorkspace(): UserWorkspaceData {
  return {
    tasks: [],
    events: [],
    habits: [],
    transactions: [],
    personEntries: [],
    budgets: [],
    financeCategories: ['Food & Dining', 'Transport', 'Housing', 'Education', 'Utilities', 'Salary', 'Freelance'],
    taskCategories: ['Personal', 'Work', 'Study', 'Health', 'Errands'],
    goals: [],
    folders: [],
    spaceItems: [],
  };
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(`onespace:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(password);
}

export function getAccounts(): LocalAuthAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as LocalAuthAccount[]) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: LocalAuthAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getActiveSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setActiveSessionUserId(userId: string | null): void {
  if (userId) {
    localStorage.setItem(SESSION_KEY, userId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getUserProfile(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(`${PROFILE_PREFIX}${profile.id}`, JSON.stringify(profile));
}

export function getUserWorkspace(userId: string): UserWorkspaceData {
  try {
    const raw = localStorage.getItem(`${WORKSPACE_PREFIX}${userId}`);
    if (!raw) return createEmptyWorkspace();
    const parsed = JSON.parse(raw) as Partial<UserWorkspaceData>;
    const defaults = createEmptyWorkspace();
    return {
      ...defaults,
      ...parsed,
      personEntries: Array.isArray(parsed.personEntries) ? parsed.personEntries : [],
    };
  } catch {
    return createEmptyWorkspace();
  }
}

export function saveUserWorkspace(userId: string, data: UserWorkspaceData): void {
  localStorage.setItem(`${WORKSPACE_PREFIX}${userId}`, JSON.stringify(data));
}

export function clearUserWorkspace(userId: string): void {
  localStorage.removeItem(`${WORKSPACE_PREFIX}${userId}`);
}

// IndexedDB Binary Blob Store for My Space uploaded files (scoped by userId prefix)
function openBlobDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BLOB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
        db.createObjectStore(BLOB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFileBlob(blobKey: string, blob: Blob): Promise<void> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
    tx.objectStore(BLOB_STORE_NAME).put(blob, blobKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFileBlob(blobKey: string): Promise<Blob | null> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE_NAME, 'readonly');
    const req = tx.objectStore(BLOB_STORE_NAME).get(blobKey);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFileBlob(blobKey: string): Promise<void> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
    tx.objectStore(BLOB_STORE_NAME).delete(blobKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
