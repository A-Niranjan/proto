/**
 * Utility for managing media storage in the browser
 */

// We'll use localStorage as a simpler alternative to a backend server
// This allows us to maintain uploaded media between sessions

// Storage keys for permanent and temporary media
const STORAGE_KEY_PERMANENT = 'videoEditor_media';
const STORAGE_KEY_TEMP = 'videoEditor_tempMedia';

/**
 * Save uploaded media to localStorage
 * @param {Object} mediaData The media data organized by type (videos, photos, audio)
 */
export const saveMedia = (mediaData) => {
  try {
    localStorage.setItem(STORAGE_KEY_PERMANENT, JSON.stringify(mediaData));
  } catch (error) {
    console.error('Error saving media to local storage:', error);
  }
};

/**
 * Load uploaded media from localStorage
 * @returns {Object} The media data organized by type
 */
export const loadMedia = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PERMANENT);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading media from local storage:', error);
  }
  
  // Return default empty structure if nothing found
  return {
    videos: [],
    photos: [],
    audio: []
  };
};

/**
 * Save a temporary media file
 * @param {Object} mediaItem The media item to save temporarily
 */
export const saveTempMedia = (mediaItem) => {
  try {
    // Get existing temp media
    let tempMedia = [];
    const existingData = localStorage.getItem(STORAGE_KEY_TEMP);
    
    if (existingData) {
      tempMedia = JSON.parse(existingData);
    }
    
    // Add new item
    tempMedia.push(mediaItem);
    
    // Save back to storage
    localStorage.setItem(STORAGE_KEY_TEMP, JSON.stringify(tempMedia));
    
    return true;
  } catch (error) {
    console.error('Error saving temp media:', error);
    return false;
  }
};

/**
 * Remove a temporary media file
 * @param {string|number} mediaId ID of the media to remove
 */
export const removeTempMedia = (mediaId) => {
  try {
    const existingData = localStorage.getItem(STORAGE_KEY_TEMP);
    
    if (!existingData) return;
    
    let tempMedia = JSON.parse(existingData);
    
    // Find the media item
    const mediaToRemove = tempMedia.find(item => 
      item.id === mediaId || item.id === parseInt(mediaId)
    );
    
    // If found and it has a blob URL, revoke it
    if (mediaToRemove && mediaToRemove.path && mediaToRemove.path.startsWith('blob:')) {
      URL.revokeObjectURL(mediaToRemove.path);
    }
    
    // Filter out the item
    tempMedia = tempMedia.filter(item => 
      item.id !== mediaId && item.id !== parseInt(mediaId)
    );
    
    // Save back to storage
    localStorage.setItem(STORAGE_KEY_TEMP, JSON.stringify(tempMedia));
  } catch (error) {
    console.error('Error removing temp media:', error);
  }
};

/**
 * Clear all temporary media
 */
export const clearAllTempMedia = () => {
  try {
    const existingData = localStorage.getItem(STORAGE_KEY_TEMP);
    
    if (existingData) {
      const tempMedia = JSON.parse(existingData);
      
      // Revoke all blob URLs
      tempMedia.forEach(item => {
        if (item.path && item.path.startsWith('blob:')) {
          URL.revokeObjectURL(item.path);
        }
      });
    }
    
    // Clear the storage
    localStorage.removeItem(STORAGE_KEY_TEMP);
  } catch (error) {
    console.error('Error clearing temp media:', error);
  }
};

/**
 * Add a new media item to permanent storage
 * @param {Object} mediaItem The media item to add
 */
export const addMediaItem = (mediaItem) => {
  try {
    const media = loadMedia();
    
    // Determine media type
    const type = mediaItem.type || determineMediaType(mediaItem.path);
    
    // Add to the appropriate category
    if (media[type]) {
      media[type] = [mediaItem, ...media[type]];
    } else {
      console.warn(`Unknown media type: ${type}`);
    }
    
    // Save updated media
    saveMedia(media);
    
    return true;
  } catch (error) {
    console.error('Error adding media item:', error);
    return false;
  }
};

/**
 * Determine media type from path
 * @param {string} path File path or URL
 * @returns {string} Media type ('videos', 'photos', or 'audio')
 */
export const determineMediaType = (path) => {
  if (!path) return 'videos'; // Default
  
  const lowerPath = path.toLowerCase();
  
  if (lowerPath.match(/\.(mp4|webm|mov|avi)$/)) {
    return 'videos';
  } else if (lowerPath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
    return 'photos';
  } else if (lowerPath.match(/\.(mp3|wav|ogg|aac|flac)$/)) {
    return 'audio';
  }
  
  return 'videos'; // Default
};
