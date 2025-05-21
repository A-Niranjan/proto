/**
 * IndexedDB-based storage system for media files
 * 
 * This provides persistent storage of actual media files that survives browser refreshes 
 * and can handle large files better than localStorage
 */

// Database configuration
const DB_NAME = 'MediaEditorDB';
const DB_VERSION = 1;
const MEDIA_STORE = 'mediaFiles';
const TEMP_STORE = 'tempFiles';
const META_STORE = 'mediaMetadata';

/**
 * Initialize the database
 * @returns {Promise} Promise resolving to the database instance
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject('Error opening database');
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(TEMP_STORE)) {
        db.createObjectStore(TEMP_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: 'id' });
        // Create indexes for faster queries
        metaStore.createIndex('type', 'type', { unique: false });
        metaStore.createIndex('name', 'name', { unique: false });
      }
    };
  });
};

/**
 * Save a file to the database
 * @param {File} file The file to save
 * @param {string} type The media type (videos, photos, audio)
 * @param {boolean} isTemp Whether this is a temporary file
 * @returns {Promise} Promise resolving to the saved media metadata
 */
export const saveFile = async (file, type, isTemp = false) => {
  try {
    const db = await initDB();
    
    // Generate a unique ID
    const id = Date.now().toString();
    
    // Create a FileReader to read the file as ArrayBuffer
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const fileData = event.target.result;
        
        // Create metadata object
        const metadata = {
          id,
          name: file.name,
          type: type || determineType(file),
          size: file.size,
          lastModified: file.lastModified || Date.now(),
          mimeType: file.type,
          isTemp
        };
        
        // Start a transaction
        const transaction = db.transaction([
          isTemp ? TEMP_STORE : MEDIA_STORE, 
          META_STORE
        ], 'readwrite');
        
        // Save the file data
        const fileStore = transaction.objectStore(isTemp ? TEMP_STORE : MEDIA_STORE);
        const fileRequest = fileStore.put({
          id,
          data: fileData
        });
        
        fileRequest.onerror = (e) => {
          console.error('Error saving file data:', e.target.error);
          reject(e.target.error);
        };
        
        // Save the metadata
        const metaStore = transaction.objectStore(META_STORE);
        const metaRequest = metaStore.put(metadata);
        
        metaRequest.onerror = (e) => {
          console.error('Error saving metadata:', e.target.error);
          reject(e.target.error);
        };
        
        transaction.oncomplete = () => {
          // Create a blob URL for immediate use
          const blob = new Blob([fileData], { type: file.type });
          const url = URL.createObjectURL(blob);
          
          // Return both metadata and the URL
          resolve({
            ...metadata,
            path: url
          });
        };
        
        transaction.onerror = (e) => {
          console.error('Transaction error:', e.target.error);
          reject(e.target.error);
        };
      };
      
      reader.onerror = (e) => {
        console.error('FileReader error:', e.target.error);
        reject(e.target.error);
      };
      
      // Read the file
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Error in saveFile:', error);
    throw error;
  }
};

/**
 * Get a file from the database by ID
 * @param {string} id The file ID
 * @param {boolean} isTemp Whether this is a temporary file
 * @returns {Promise} Promise resolving to the file blob URL and metadata
 */
export const getFile = async (id, isTemp = false) => {
  try {
    const db = await initDB();
    
    // Get metadata
    const metaStore = db.transaction(META_STORE, 'readonly')
      .objectStore(META_STORE);
    
    return new Promise((resolve, reject) => {
      const metaRequest = metaStore.get(id);
      
      metaRequest.onerror = (e) => {
        console.error('Error getting metadata:', e.target.error);
        reject(e.target.error);
      };
      
      metaRequest.onsuccess = (event) => {
        const metadata = event.target.result;
        
        if (!metadata) {
          reject(new Error('File metadata not found'));
          return;
        }
        
        // Get file data
        const fileStore = db.transaction(isTemp ? TEMP_STORE : MEDIA_STORE, 'readonly')
          .objectStore(isTemp ? TEMP_STORE : MEDIA_STORE);
        
        const fileRequest = fileStore.get(id);
        
        fileRequest.onerror = (e) => {
          console.error('Error getting file data:', e.target.error);
          reject(e.target.error);
        };
        
        fileRequest.onsuccess = (event) => {
          const fileRecord = event.target.result;
          
          if (!fileRecord) {
            reject(new Error('File data not found'));
            return;
          }
          
          // Create a blob URL
          const blob = new Blob([fileRecord.data], { type: metadata.mimeType });
          const url = URL.createObjectURL(blob);
          
          resolve({
            ...metadata,
            path: url
          });
        };
      };
    });
  } catch (error) {
    console.error('Error in getFile:', error);
    throw error;
  }
};

/**
 * Get all media files by type
 * @param {string} type The media type to filter by (videos, photos, audio)
 * @returns {Promise} Promise resolving to an array of media items with blob URLs
 */
export const getAllMedia = async (type = null) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([META_STORE, MEDIA_STORE], 'readonly');
    const metaStore = transaction.objectStore(META_STORE);
    const fileStore = transaction.objectStore(MEDIA_STORE);
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (type) {
        // Get specific type using index
        const index = metaStore.index('type');
        request = index.getAll(type);
      } else {
        // Get all metadata where isTemp is not true
        request = metaStore.getAll();
      }
      
      request.onerror = (e) => {
        console.error('Error getting metadata:', e.target.error);
        reject(e.target.error);
      };
      
      request.onsuccess = async (event) => {
        let metadataList = event.target.result;
        
        // Filter out temp files
        metadataList = metadataList.filter(item => !item.isTemp);
        
        if (metadataList.length === 0) {
          resolve([]);
          return;
        }
        
        // Load each file and create blob URLs
        const mediaPromises = metadataList.map(async (metadata) => {
          try {
            const fileRequest = fileStore.get(metadata.id);
            
            return new Promise((resolveFile, rejectFile) => {
              fileRequest.onerror = (e) => {
                console.error('Error getting file data:', e.target.error);
                rejectFile(e.target.error);
              };
              
              fileRequest.onsuccess = (event) => {
                const fileRecord = event.target.result;
                
                if (!fileRecord) {
                  // Skip missing files
                  resolveFile(null);
                  return;
                }
                
                // Create a blob URL
                const blob = new Blob([fileRecord.data], { type: metadata.mimeType });
                const url = URL.createObjectURL(blob);
                
                resolveFile({
                  ...metadata,
                  path: url
                });
              };
            });
          } catch (error) {
            console.error('Error loading file data:', error);
            return null;
          }
        });
        
        // Wait for all promises to resolve
        const results = await Promise.all(mediaPromises);
        
        // Filter out nulls
        const validResults = results.filter(item => item !== null);
        
        resolve(validResults);
      };
    });
  } catch (error) {
    console.error('Error in getAllMedia:', error);
    throw error;
  }
};

/**
 * Get all media organized by type
 * @returns {Promise} Promise resolving to an object with media organized by type
 */
export const getAllMediaByType = async () => {
  try {
    const allMedia = await getAllMedia();
    
    // Organize by type
    const result = {
      videos: [],
      photos: [],
      audio: []
    };
    
    allMedia.forEach(item => {
      if (item.type in result) {
        result[item.type].push(item);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error getting media by type:', error);
    throw error;
  }
};

/**
 * Remove a file from the database
 * @param {string} id The file ID
 * @param {boolean} isTemp Whether this is a temporary file
 * @returns {Promise} Promise resolving when the file is removed
 */
export const removeFile = async (id, isTemp = false) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([META_STORE, isTemp ? TEMP_STORE : MEDIA_STORE], 'readwrite');
    const metaStore = transaction.objectStore(META_STORE);
    const fileStore = transaction.objectStore(isTemp ? TEMP_STORE : MEDIA_STORE);
    
    return new Promise((resolve, reject) => {
      // Get metadata to check if it exists and get the path
      const metaRequest = metaStore.get(id);
      
      metaRequest.onerror = (e) => {
        console.error('Error getting metadata before delete:', e.target.error);
        reject(e.target.error);
      };
      
      metaRequest.onsuccess = (event) => {
        const metadata = event.target.result;
        
        if (!metadata) {
          resolve(); // Already gone
          return;
        }
        
        // Delete from metadata store
        const deleteMetaRequest = metaStore.delete(id);
        
        deleteMetaRequest.onerror = (e) => {
          console.error('Error deleting metadata:', e.target.error);
          reject(e.target.error);
        };
        
        // Delete from file store
        const deleteFileRequest = fileStore.delete(id);
        
        deleteFileRequest.onerror = (e) => {
          console.error('Error deleting file data:', e.target.error);
          reject(e.target.error);
        };
        
        transaction.oncomplete = () => {
          console.log(`File ${id} deleted successfully`);
          resolve();
        };
      };
    });
  } catch (error) {
    console.error('Error in removeFile:', error);
    throw error;
  }
};

/**
 * Clear all temporary files
 * @returns {Promise} Promise resolving when all temp files are cleared
 */
export const clearTempFiles = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([META_STORE, TEMP_STORE], 'readwrite');
    const metaStore = transaction.objectStore(META_STORE);
    const tempStore = transaction.objectStore(TEMP_STORE);
    
    return new Promise((resolve, reject) => {
      // Find all temp files in metadata
      const index = metaStore.index('type');
      const request = metaStore.getAll();
      
      request.onerror = (e) => {
        console.error('Error getting temp metadata:', e.target.error);
        reject(e.target.error);
      };
      
      request.onsuccess = (event) => {
        const metadata = event.target.result;
        const tempItems = metadata.filter(item => item.isTemp);
        
        if (tempItems.length === 0) {
          resolve(0);
          return;
        }
        
        let deletedCount = 0;
        
        tempItems.forEach(item => {
          // Delete from metadata store
          const deleteMetaRequest = metaStore.delete(item.id);
          
          deleteMetaRequest.onerror = (e) => {
            console.error('Error deleting temp metadata:', e.target.error);
          };
          
          // Delete from temp store
          const deleteTempRequest = tempStore.delete(item.id);
          
          deleteTempRequest.onsuccess = () => {
            deletedCount++;
            if (deletedCount === tempItems.length) {
              console.log(`Cleared ${deletedCount} temp files`);
              resolve(deletedCount);
            }
          };
          
          deleteTempRequest.onerror = (e) => {
            console.error('Error deleting temp file:', e.target.error);
          };
        });
      };
    });
  } catch (error) {
    console.error('Error in clearTempFiles:', error);
    throw error;
  }
};

/**
 * Add a file from drag and drop to temp storage
 * @param {Object} fileData File data object
 * @returns {Promise} Promise resolving to the saved media metadata
 */
export const saveTempFileFromDataTransfer = async (fileData) => {
  try {
    const db = await initDB();
    
    // Generate a unique ID if not provided
    const id = fileData.id || Date.now().toString();
    
    // Make a fetch request to get the file data
    const response = await fetch(fileData.path);
    const blob = await response.blob();
    
    // Read the blob as ArrayBuffer
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const fileData = event.target.result;
        
        // Create metadata with temp flag
        const metadata = {
          ...fileData,
          id,
          isTemp: true
        };
        
        // Start transaction
        const transaction = db.transaction([TEMP_STORE, META_STORE], 'readwrite');
        const tempStore = transaction.objectStore(TEMP_STORE);
        const metaStore = transaction.objectStore(META_STORE);
        
        // Save file data
        const fileRequest = tempStore.put({
          id,
          data: fileData
        });
        
        fileRequest.onerror = (e) => {
          console.error('Error saving temp file data:', e.target.error);
          reject(e.target.error);
        };
        
        // Save metadata
        const metaRequest = metaStore.put(metadata);
        
        metaRequest.onerror = (e) => {
          console.error('Error saving temp metadata:', e.target.error);
          reject(e.target.error);
        };
        
        transaction.oncomplete = () => {
          resolve({
            ...metadata,
            path: fileData.path // Keep the original path
          });
        };
      };
      
      reader.onerror = (e) => {
        console.error('FileReader error:', e.target.error);
        reject(e.target.error);
      };
      
      reader.readAsArrayBuffer(blob);
    });
  } catch (error) {
    console.error('Error in saveTempFileFromDataTransfer:', error);
    throw error;
  }
};

/**
 * Determine the media type from a file
 * @param {File} file The file to analyze
 * @returns {string} The media type (videos, photos, audio)
 */
export const determineType = (file) => {
  if (file.type.startsWith('video/')) {
    return 'videos';
  } else if (file.type.startsWith('image/')) {
    return 'photos';
  } else if (file.type.startsWith('audio/')) {
    return 'audio';
  }
  
  // Try to determine by file extension
  const name = file.name.toLowerCase();
  if (name.match(/\.(mp4|webm|mov|avi)$/)) {
    return 'videos';
  } else if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
    return 'photos';
  } else if (name.match(/\.(mp3|wav|ogg|aac|flac)$/)) {
    return 'audio';
  }
  
  return 'videos'; // Default
};
