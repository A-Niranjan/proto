/**
 * Simple media storage system using localStorage for metadata
 * and persistent blob URLs for the actual media
 */

// Keys for storage
const MEDIA_STORAGE_KEY = 'videoEditor_media';
const MEDIA_REFS_KEY = 'videoEditor_mediaRefs';
const TEMP_MEDIA_KEY = 'videoEditor_tempMedia';

/**
 * Save media data to localStorage
 * @param {Object} mediaData - The media data organized by type (videos, photos, audio)
 */
export const saveMediaData = (mediaData) => {
  try {
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(mediaData));
    console.log('Saved media metadata');
  } catch (error) {
    console.error('Failed to save media data:', error);
  }
};

/**
 * Load media data from localStorage
 * @returns {Object} Media data by type
 */
export const loadMediaData = () => {
  try {
    const data = localStorage.getItem(MEDIA_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load media data:', error);
  }
  
  // Default empty structure
  return {
    videos: [],
    photos: [],
    audio: []
  };
};

/**
 * Handle file upload
 * @param {File} file - The file to upload
 * @param {string} mediaType - Type of media (videos, photos, audio)
 * @returns {Object} Media object
 */
export const handleMediaUpload = (file, mediaType) => {
  // Create object URL for the file (this persists until browser is closed)
  const objectUrl = URL.createObjectURL(file);
  
  // Generate unique ID
  const id = Date.now().toString();
  
  // Determine type if not provided
  const type = mediaType || determineType(file);
  
  // Create media object
  const mediaItem = {
    id,
    name: file.name,
    path: objectUrl,
    type,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    mimeType: file.type
  };
  
  // Keep track of created URLs
  saveMediaRef(id, objectUrl);
  
  return mediaItem;
};

/**
 * Save reference to a created object URL
 * @param {string} id - Media ID
 * @param {string} url - Object URL
 */
export const saveMediaRef = (id, url) => {
  try {
    // Get existing refs
    let refs = {};
    const existingRefs = localStorage.getItem(MEDIA_REFS_KEY);
    if (existingRefs) {
      refs = JSON.parse(existingRefs);
    }
    
    // Add new ref
    refs[id] = url;
    
    // Save updated refs
    localStorage.setItem(MEDIA_REFS_KEY, JSON.stringify(refs));
  } catch (error) {
    console.error('Failed to save media ref:', error);
  }
};

/**
 * Remove media reference and revoke URL
 * @param {string} id - Media ID
 */
export const removeMediaRef = (id) => {
  try {
    // Get existing refs
    const existingRefs = localStorage.getItem(MEDIA_REFS_KEY);
    if (existingRefs) {
      const refs = JSON.parse(existingRefs);
      
      // Revoke URL if it exists
      if (refs[id]) {
        try {
          URL.revokeObjectURL(refs[id]);
        } catch (e) {
          console.warn('Failed to revoke URL:', e);
        }
        
        // Remove from refs
        delete refs[id];
        
        // Save updated refs
        localStorage.setItem(MEDIA_REFS_KEY, JSON.stringify(refs));
      }
    }
  } catch (error) {
    console.error('Failed to remove media ref:', error);
  }
};

/**
 * Clear all temporary media
 */
export const clearTempMedia = () => {
  try {
    // Get temp media
    const tempMediaStr = localStorage.getItem(TEMP_MEDIA_KEY);
    if (tempMediaStr) {
      const tempMedia = JSON.parse(tempMediaStr);
      
      // Revoke URLs for all temp media
      tempMedia.forEach(item => {
        if (item.path && item.path.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(item.path);
          } catch (e) {
            console.warn('Failed to revoke temp URL:', e);
          }
        }
      });
    }
    
    // Clear temp media from storage
    localStorage.removeItem(TEMP_MEDIA_KEY);
  } catch (error) {
    console.error('Failed to clear temp media:', error);
  }
};

/**
 * Save temporary media item
 * @param {Object} mediaItem - Media item to save temporarily
 */
export const saveTempMedia = (mediaItem) => {
  try {
    // Get existing temp media
    let tempMedia = [];
    const existingTempMedia = localStorage.getItem(TEMP_MEDIA_KEY);
    if (existingTempMedia) {
      tempMedia = JSON.parse(existingTempMedia);
    }
    
    // Add to temp media
    tempMedia.push(mediaItem);
    
    // Save updated temp media
    localStorage.setItem(TEMP_MEDIA_KEY, JSON.stringify(tempMedia));
  } catch (error) {
    console.error('Failed to save temp media:', error);
  }
};

/**
 * Remove temporary media item
 * @param {string} id - Media ID
 */
export const removeTempMedia = (id) => {
  try {
    // Get existing temp media
    const existingTempMedia = localStorage.getItem(TEMP_MEDIA_KEY);
    if (existingTempMedia) {
      let tempMedia = JSON.parse(existingTempMedia);
      
      // Find item
      const itemToRemove = tempMedia.find(item => item.id === id);
      if (itemToRemove && itemToRemove.path && itemToRemove.path.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(itemToRemove.path);
        } catch (e) {
          console.warn('Failed to revoke temp URL:', e);
        }
      }
      
      // Filter out item
      tempMedia = tempMedia.filter(item => item.id !== id);
      
      // Save updated temp media
      localStorage.setItem(TEMP_MEDIA_KEY, JSON.stringify(tempMedia));
    }
  } catch (error) {
    console.error('Failed to remove temp media:', error);
  }
};

/**
 * Determine media type from file
 * @param {File} file - File to determine type for
 * @returns {string} Media type (videos, photos, audio)
 */
export const determineType = (file) => {
  if (file.type.startsWith('video/')) return 'videos';
  if (file.type.startsWith('image/')) return 'photos';
  if (file.type.startsWith('audio/')) return 'audio';
  
  // Try to determine by file name
  const name = file.name.toLowerCase();
  if (name.match(/\.(mp4|webm|mov|avi)$/)) return 'videos';
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'photos';
  if (name.match(/\.(mp3|wav|ogg|aac)$/)) return 'audio';
  
  return 'videos'; // Default
};
