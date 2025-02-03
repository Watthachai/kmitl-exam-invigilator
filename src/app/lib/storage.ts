export const storage = {
    get: (key: string) => {
      if (typeof window === 'undefined') return null;
      try {
        const item = sessionStorage.getItem(key);
        if (!item) return null;
        
        // Handle string values that shouldn't be parsed
        if (key === 'lastUploadedFile') return item;
        
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      } catch (error) {
        console.error('Error getting item from storage:', error);
        return null;
      }
    },
    
    set: (key: string, data: any) => {
      if (typeof window === 'undefined') return;
      try {
        const value = key === 'lastUploadedFile' ? data : JSON.stringify(data);
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error('Error setting item in storage:', error);
      }
    },
    
    remove: (key: string) => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from storage:', error);
      }
    }
};
