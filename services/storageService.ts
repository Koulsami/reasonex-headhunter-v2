
export const STORAGE_KEYS = {
  CLIENTS: 'reasonex_clients',
  JOBS: 'reasonex_jobs',
  CANDIDATES: 'reasonex_candidates',
  ALLOWED_USERS: 'reasonex_allowed_users'
};

export const saveData = (key: string, data: any) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.error(`Error saving data to ${key}:`, error);
  }
};

export const loadData = <T>(key: string, defaultData: T): T => {
  try {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultData;
    }
    return defaultData;
  } catch (error) {
    console.error(`Error loading data from ${key}:`, error);
    return defaultData;
  }
};

export const clearData = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CLIENTS);
      localStorage.removeItem(STORAGE_KEYS.JOBS);
      localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
      // We generally don't want to clear allowed users on a data reset, 
      // but if strictly requested, uncomment below.
      // localStorage.removeItem(STORAGE_KEYS.ALLOWED_USERS);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};