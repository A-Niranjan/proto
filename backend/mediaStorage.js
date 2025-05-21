const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

// Create folders if they don't exist
const mediaDirectory = path.join(__dirname, 'uploads');
const tempDirectory = path.join(__dirname, 'temp');

if (!fs.existsSync(mediaDirectory)) {
  fs.mkdirSync(mediaDirectory, { recursive: true });
}

if (!fs.existsSync(tempDirectory)) {
  fs.mkdirSync(tempDirectory, { recursive: true });
}

// Configure multer for file uploads
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mediaDirectory);
  },
  filename: function (req, file, cb) {
    // Use original filename but add timestamp to avoid collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDirectory);
  },
  filename: function (req, file, cb) {
    // Use original filename but add timestamp to avoid collisions
    const uniqueName = `temp-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const uploadMedia = multer({ storage: mediaStorage });
const uploadTemp = multer({ storage: tempStorage });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(mediaDirectory));
app.use('/temp', express.static(tempDirectory));

// Routes for uploading media
app.post('/upload/media', uploadMedia.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileData = {
    id: Date.now(),
    name: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size,
    type: req.file.mimetype.startsWith('video/') ? 'videos' : 
          req.file.mimetype.startsWith('image/') ? 'photos' : 
          req.file.mimetype.startsWith('audio/') ? 'audio' : 'other',
    lastModified: Date.now()
  };
  
  res.json(fileData);
});

// Routes for uploading temporary media
app.post('/upload/temp', uploadTemp.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileData = {
    id: Date.now(),
    name: req.file.originalname,
    path: `/temp/${req.file.filename}`,
    size: req.file.size,
    type: req.file.mimetype.startsWith('video/') ? 'videos' : 
          req.file.mimetype.startsWith('image/') ? 'photos' : 
          req.file.mimetype.startsWith('audio/') ? 'audio' : 'other',
    lastModified: Date.now()
  };
  
  res.json(fileData);
});

// Route to retrieve all stored media
app.get('/media', (req, res) => {
  fs.readdir(mediaDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read media directory' });
    }
    
    const mediaFiles = files.map(file => {
      const filePath = path.join(mediaDirectory, file);
      const stats = fs.statSync(filePath);
      
      return {
        id: parseInt(file.split('-')[0]),
        name: file.substring(file.indexOf('-') + 1),
        path: `/uploads/${file}`,
        size: stats.size,
        type: getFileType(file),
        lastModified: stats.mtime.getTime()
      };
    });
    
    res.json(mediaFiles);
  });
});

// Delete temp file
app.delete('/temp/:filename', (req, res) => {
  const filePath = path.join(tempDirectory, req.params.filename);
  
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete temp file' });
    }
    
    res.json({ success: true });
  });
});

// Clean all temp files
app.delete('/temp', (req, res) => {
  fs.readdir(tempDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read temp directory' });
    }
    
    let deletedCount = 0;
    
    if (files.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }
    
    files.forEach(file => {
      const filePath = path.join(tempDirectory, file);
      fs.unlink(filePath, err => {
        if (!err) deletedCount++;
        
        if (deletedCount === files.length) {
          res.json({ success: true, deletedCount });
        }
      });
    });
  });
});

// Helper function to determine file type
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
    return 'videos';
  } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    return 'photos';
  } else if (['.mp3', '.wav', '.aac', '.ogg'].includes(ext)) {
    return 'audio';
  }
  
  return 'other';
}

// Start server
app.listen(PORT, () => {
  console.log(`Media server running on port ${PORT}`);
  console.log(`Media directory: ${mediaDirectory}`);
  console.log(`Temp directory: ${tempDirectory}`);
});

// Clean temp files on server start
fs.readdir(tempDirectory, (err, files) => {
  if (err) {
    console.error('Error reading temp directory:', err);
    return;
  }
  
  console.log(`Cleaning ${files.length} temporary files...`);
  
  files.forEach(file => {
    const filePath = path.join(tempDirectory, file);
    fs.unlink(filePath, err => {
      if (err) {
        console.error(`Error deleting temp file ${file}:`, err);
      }
    });
  });
});
