const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Create necessary directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const TEMP_DIR = path.join(__dirname, 'temp');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure all directories exist
[UPLOADS_DIR, VIDEOS_DIR, PHOTOS_DIR, AUDIO_DIR, TEMP_DIR, THUMBNAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Function to generate thumbnail from video using ffmpeg
const generateVideoThumbnail = (videoPath, videoFileName) => {
  return new Promise((resolve, reject) => {
    try {
      // Create thumbnail filename based on the video filename
      const thumbnailFileName = `${path.basename(videoFileName, path.extname(videoFileName))}-thumbnail.jpg`;
      const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFileName);
      
      // Using child_process to call ffmpeg
      const { exec } = require('child_process');
      
      // Generate thumbnail at 1 second mark
      const command = `ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}" -y`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error generating thumbnail: ${error.message}`);
          reject(error);
          return;
        }
        
        console.log(`Thumbnail generated: ${thumbnailPath}`);
        resolve(`/api/thumbnails/${thumbnailFileName}`);
      });
    } catch (err) {
      console.error(`Exception generating thumbnail: ${err.message}`);
      reject(err);
    }
  });
};

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type and if it's temporary
    const isTemp = req.path.includes('/temp');
    let targetDir = TEMP_DIR;

    if (!isTemp) {
      // Determine media type based on mimetype
      if (file.mimetype.startsWith('video/')) {
        targetDir = VIDEOS_DIR;
      } else if (file.mimetype.startsWith('image/')) {
        targetDir = PHOTOS_DIR;
      } else if (file.mimetype.startsWith('audio/')) {
        targetDir = AUDIO_DIR;
      }
    }
    
    console.log(`Saving file to directory: ${targetDir}`);
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({ storage: storage });

// Serve static files from directories
app.use('/api/videos', express.static(VIDEOS_DIR));
app.use('/api/photos', express.static(PHOTOS_DIR));
app.use('/api/audio', express.static(AUDIO_DIR));
app.use('/api/temp', express.static(TEMP_DIR));
app.use('/api/thumbnails', express.static(THUMBNAILS_DIR));

// Allow preflight requests for all routes
app.options('*', cors());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Request headers:', req.headers);
  }
  next();
});

// Upload endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('Upload endpoint hit with body:', req.body);
  console.log('Files in request:', req.files);
  console.log('File in request:', req.file);
  
  if (!req.file) {
    console.error('Error: No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  console.log(`Saved to: ${req.file.path}`);
  
  // Determine file type based on mimetype
  let fileType = 'videos';
  if (req.file.mimetype.startsWith('image/')) {
    fileType = 'photos';
  } else if (req.file.mimetype.startsWith('audio/')) {
    fileType = 'audio';
  }
  
  try {
    // Generate thumbnail for videos
    let thumbnailPath = null;
    if (fileType === 'videos') {
      try {
        thumbnailPath = await generateVideoThumbnail(req.file.path, req.file.filename);
        console.log(`Generated thumbnail: ${thumbnailPath}`);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Continue even if thumbnail generation fails
      }
    }
    
    // Use the image itself as the thumbnail for photos
    if (fileType === 'photos') {
      thumbnailPath = `/api/photos/${req.file.filename}`;
    }
    
    // Return file metadata
    res.json({
      id: path.basename(req.file.filename).split('-')[0],
      name: req.file.originalname,
      path: `/api/${fileType}/${req.file.filename}`,
      type: fileType,
      size: req.file.size,
      lastModified: Date.now(),
      isTemp: false,
      thumbnailPath: thumbnailPath
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Error processing upload' });
  }
});

// Upload temp file
app.post('/api/upload/temp', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`Temp file uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  console.log(`Saved to: ${req.file.path}`);
  
  // Determine file type based on mimetype
  let fileType = 'videos';
  if (req.file.mimetype.startsWith('image/')) {
    fileType = 'photos';
  } else if (req.file.mimetype.startsWith('audio/')) {
    fileType = 'audio';
  }
  
  // Return file metadata
  res.json({
    id: path.basename(req.file.filename).split('-')[0],
    name: req.file.originalname,
    path: `/api/temp/${req.file.filename}`,
    type: fileType,
    size: req.file.size,
    lastModified: Date.now(),
    isTemp: true
  });
});

// Delete temp file
app.delete('/api/temp/:filename', (req, res) => {
  const filePath = path.join(TEMP_DIR, req.params.filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Deleted ${req.params.filename}` });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Get all media files
app.get('/api/media', (req, res) => {
  const media = {
    videos: [],
    photos: [],
    audio: []
  };
  
  // Helper function to read files from directory
  const readMediaDir = (dir, type) => {
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    return fs.readdirSync(dir)
      .filter(file => fs.statSync(path.join(dir, file)).isFile())
      .map(file => {
        const stats = fs.statSync(path.join(dir, file));
        const timestamp = file.split('-')[0];
        const originalName = file.substring(timestamp.length + 1);
        
        // Check if there's a thumbnail for this file (for videos)
        let thumbnailPath = null;
        if (type === 'videos') {
          const thumbnailFileName = `${path.basename(file, path.extname(file))}-thumbnail.jpg`;
          const thumbnailFullPath = path.join(THUMBNAILS_DIR, thumbnailFileName);
          
          if (fs.existsSync(thumbnailFullPath)) {
            thumbnailPath = `/api/thumbnails/${thumbnailFileName}`;
          }
        } else if (type === 'photos') {
          // For photos, use the image itself as thumbnail
          thumbnailPath = `/api/${type}/${file}`;
        }
        
        return {
          id: timestamp,
          name: originalName,
          path: `/api/${type}/${file}`,
          type: type,
          size: stats.size,
          lastModified: parseInt(timestamp, 10),
          thumbnailPath: thumbnailPath
        };
      })
      .sort((a, b) => b.lastModified - a.lastModified); // Sort newest first
  };
  
  // Read all media directories
  media.videos = readMediaDir(VIDEOS_DIR, 'videos');
  media.photos = readMediaDir(PHOTOS_DIR, 'photos');
  media.audio = readMediaDir(AUDIO_DIR, 'audio');
  
  res.json(media);
});

// Serve the test HTML pages
app.get('/api/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload_test.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-page.html'));
});

// Clean temp files
app.delete('/api/temp', (req, res) => {
  let count = 0;
  
  if (fs.existsSync(TEMP_DIR)) {
    fs.readdirSync(TEMP_DIR).forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        count++;
      }
    });
  }
  
  res.json({ success: true, deletedCount: count, message: `Deleted ${count} temporary files` });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Media server running on http://localhost:${PORT}`);
  console.log(`File storage locations:`);
  console.log(`- Videos: ${VIDEOS_DIR}`);
  console.log(`- Photos: ${PHOTOS_DIR}`);
  console.log(`- Audio: ${AUDIO_DIR}`);
  console.log(`- Temp: ${TEMP_DIR}`);
  console.log(`- Thumbnails: ${THUMBNAILS_DIR}`);
});
