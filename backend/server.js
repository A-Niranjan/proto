const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create media directories if they don't exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TEMP_DIR = path.join(__dirname, 'temp');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');

// Make sure all directories exist
[UPLOADS_DIR, TEMP_DIR, VIDEOS_DIR, PHOTOS_DIR, AUDIO_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Determine destination folder based on file type
    let destFolder = VIDEOS_DIR;
    
    if (file.mimetype.startsWith('image/')) {
      destFolder = PHOTOS_DIR;
    } else if (file.mimetype.startsWith('audio/')) {
      destFolder = AUDIO_DIR;
    }
    
    cb(null, destFolder);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with original extension
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Configure temp storage
const tempStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function(req, file, cb) {
    const uniqueName = `temp-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Set up multer middleware
const upload = multer({ storage });
const uploadTemp = multer({ storage: tempStorage });

// Apply CORS and JSON middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/temp', express.static(TEMP_DIR));

// Route for uploading media files
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Determine media type
  let mediaType = 'videos';
  if (req.file.mimetype.startsWith('image/')) {
    mediaType = 'photos';
  } else if (req.file.mimetype.startsWith('audio/')) {
    mediaType = 'audio';
  }
  
  // Create response with file information
  const fileInfo = {
    id: Date.now().toString(),
    name: req.file.originalname,
    path: `/uploads/${mediaType}/${req.file.filename}`,
    type: mediaType,
    size: req.file.size,
    mimeType: req.file.mimetype,
    lastModified: Date.now()
  };
  
  res.json(fileInfo);
});

// Route for uploading temporary files
app.post('/api/upload/temp', uploadTemp.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Determine media type
  let mediaType = 'videos';
  if (req.file.mimetype.startsWith('image/')) {
    mediaType = 'photos';
  } else if (req.file.mimetype.startsWith('audio/')) {
    mediaType = 'audio';
  }
  
  // Create response with file information
  const fileInfo = {
    id: Date.now().toString(),
    name: req.file.originalname,
    path: `/temp/${req.file.filename}`,
    type: mediaType,
    size: req.file.size,
    mimeType: req.file.mimetype,
    lastModified: Date.now(),
    isTemp: true
  };
  
  res.json(fileInfo);
});

// Route to list all media files
app.get('/api/media', (req, res) => {
  const result = {
    videos: [],
    photos: [],
    audio: []
  };
  
  // Helper function to read files from a directory
  const readMediaDir = (dir, type) => {
    try {
      const files = fs.readdirSync(dir);
      
      return files.map(filename => {
        const stats = fs.statSync(path.join(dir, filename));
        const originalName = filename.substring(filename.indexOf('-') + 1);
        
        return {
          id: filename.split('-')[0],
          name: originalName,
          path: `/uploads/${type}/${filename}`,
          type: type,
          size: stats.size,
          lastModified: stats.mtime.getTime()
        };
      });
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      return [];
    }
  };
  
  // Read all media types
  result.videos = readMediaDir(VIDEOS_DIR, 'videos');
  result.photos = readMediaDir(PHOTOS_DIR, 'photos');
  result.audio = readMediaDir(AUDIO_DIR, 'audio');
  
  res.json(result);
});

// Route to delete a temp file
app.delete('/api/temp/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(TEMP_DIR, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Delete the file
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Deleted ${filename}` });
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Route to clean all temp files
app.delete('/api/temp', (req, res) => {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    let deletedCount = 0;
    
    files.forEach(filename => {
      try {
        fs.unlinkSync(path.join(TEMP_DIR, filename));
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting temp file ${filename}:`, error);
      }
    });
    
    res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} temp files` });
  } catch (error) {
    console.error('Error cleaning temp directory:', error);
    res.status(500).json({ error: 'Failed to clean temp directory' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Media uploads directory: ${UPLOADS_DIR}`);
  console.log(`Temp directory: ${TEMP_DIR}`);
});

// Clean temp files on server start
try {
  const tempFiles = fs.readdirSync(TEMP_DIR);
  if (tempFiles.length > 0) {
    console.log(`Cleaning ${tempFiles.length} temporary files...`);
    tempFiles.forEach(filename => {
      try {
        fs.unlinkSync(path.join(TEMP_DIR, filename));
      } catch (error) {
        console.error(`Failed to delete temp file ${filename}:`, error);
      }
    });
  }
} catch (error) {
  console.error('Error cleaning temp directory on startup:', error);
}
