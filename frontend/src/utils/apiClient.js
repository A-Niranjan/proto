/**
 * API client for communicating with the backend server
 */

// Base URL for API requests
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Upload a media file to the server
 * @param {File} file - The file to upload
 * @param {boolean} isTemp - Whether this is a temporary file
 * @returns {Promise} Promise that resolves to the uploaded file data
 */
export const uploadFile = async (file, isTemp = false) => {
  const endpoint = isTemp ? `${API_BASE_URL}/upload/temp` : `${API_BASE_URL}/upload`;
  
  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`File uploaded to ${isTemp ? 'temp' : 'permanent'} storage:`, data);
    
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Get all media files from the server
 * @returns {Promise} Promise that resolves to media files organized by type
 */
export const getAllMedia = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/media`);
    
    if (!response.ok) {
      throw new Error(`Failed to get media: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Loaded media from server:', data);
    
    return data;
  } catch (error) {
    console.error('Error getting media:', error);
    // Return empty structure if there's an error
    return {
      videos: [],
      photos: [],
      audio: []
    };
  }
};

/**
 * Delete a temporary file
 * @param {string} filename - The filename to delete
 * @returns {Promise} Promise that resolves when the file is deleted
 */
export const deleteTempFile = async (filename) => {
  try {
    const response = await fetch(`${API_BASE_URL}/temp/${filename}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete temp file: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Deleted temp file:', data);
    
    return data;
  } catch (error) {
    console.error('Error deleting temp file:', error);
    throw error;
  }
};

/**
 * Clear all temporary files
 * @returns {Promise} Promise that resolves when all temp files are cleared
 */
export const clearTempFiles = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/temp`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear temp files: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Cleared all temp files:', data);
    
    return data;
  } catch (error) {
    console.error('Error clearing temp files:', error);
    throw error;
  }
};
