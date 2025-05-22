import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import './VideoList.css';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  TextField,
  InputAdornment,
  Badge,
  Tooltip,
  Chip,
  ButtonGroup,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Fade,
  CircularProgress
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import PhotoIcon from '@mui/icons-material/Photo';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Import VideoUploader component
import VideoUploader from './VideoUploader';

const VideoList = ({ videos = [], selectedVideo, onSelectVideo, onTabChange, activeTab, setUploadedMedia, uploadedMedia, onFileUploaded }) => {
  // Theme access for styling
  const theme = useTheme();
  // State management
  const [viewMode, setViewMode] = useState('grid'); // 'list' or 'grid'
  const [sortOption, setSortOption] = useState('modified'); // 'name', 'modified', 'duration'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [filterValue, setFilterValue] = useState(''); // Search filter text
  const [menuAnchorEl, setMenuAnchorEl] = useState(null); // For the options menu
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null); // For the sort menu
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null); // For the filter menu
  const [actionVideoId, setActionVideoId] = useState(null); // ID of the video being acted on
  const [favorites, setFavorites] = useState([]); // List of favorited video IDs
  const [hoverVideo, setHoverVideo] = useState(null); // Video being hovered for preview
  const [hoverTimeout, setHoverTimeout] = useState(null); // Timeout 
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false); // Upload dialog state
  const [isUploading, setIsUploading] = useState(false); // Upload progress state
  const fileInputRef = useRef(null); // Reference to hidden file input
  
  // Handle file upload
  const handleVideoUpload = () => {
    // Here you would implement video upload logic
    fileInputRef.current?.click();
  };
  
  // Generate thumbnail for video files
  const generateVideoThumbnail = (videoFile) => {
    return new Promise((resolve) => {
      // Create video element
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.playsInline = true;
      video.muted = true;
      
      // Create object URL for the file
      const videoURL = URL.createObjectURL(videoFile);
      video.src = videoURL;
      
      // When video metadata is loaded, seek to a position and capture
      video.onloadedmetadata = () => {
        // Seek to 25% of the video
        video.currentTime = Math.min(video.duration * 0.25, 5.0); // 25% or max 5 seconds
      };
      
      // When seeking completes, capture the frame
      video.onseeked = () => {
        // Create a canvas to capture the frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL (thumbnail)
        const thumbnailURL = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up resources
        URL.revokeObjectURL(videoURL);
        
        // Return the thumbnail URL
        resolve({
          thumbnailURL,
          duration: video.duration
        });
      };
      
      // If there's an error, use a fallback
      video.onerror = () => {
        URL.revokeObjectURL(videoURL);
        resolve({ thumbnailURL: null, duration: 0 });
      };

      // Start loading the video
      video.load();
    });
  };
  // Handle file upload
  const handleFileUpload = async (file) => {
    // Create a unique ID
    const newId = Date.now();
    
    // Create a URL for the uploaded file
    const fileURL = URL.createObjectURL(file);
    
    // Determine file type
    let fileType = 'videos'; // Default
    if (file.type.startsWith('image/')) {
      fileType = 'photos';
    } else if (file.type.startsWith('audio/')) {
      fileType = 'audio';
    }
    
    // Generate thumbnail and get duration for videos
    let thumbnailURL = null;
    let duration = 0;
    
    if (fileType === 'videos') {
      const result = await generateVideoThumbnail(file);
      thumbnailURL = result.thumbnailURL;
      duration = result.duration;
    } else if (fileType === 'photos') {
      thumbnailURL = fileURL;
    }
    
    // Create new media item
    const newMedia = {
      id: newId,
      name: file.name,
      thumbnail: thumbnailURL,
      path: fileURL,
      type: fileType,
      size: file.size,
      duration: duration,
      lastModified: file.lastModified || Date.now(),
      isUploaded: true
    };
    
    // Update the uploaded media state
    if (setUploadedMedia) {
      setUploadedMedia(prev => {
        // Deep copy previous state
        const updatedMedia = JSON.parse(JSON.stringify(prev || {}));
        
        // Initialize the type array if it doesn't exist
        if (!updatedMedia[fileType]) {
          updatedMedia[fileType] = [];
        }
        
        // Add the new media
        updatedMedia[fileType].push(newMedia);
        
        return updatedMedia;
      });
    }
    
    // Clear the upload state
    setIsUploading(false);
    
    // Switch to the appropriate tab if needed
    if (activeTab !== fileType && onTabChange) {
      console.log('Switching to tab:', fileType);
      onTabChange(fileType);
    }
    
    // Auto-select the media
    if (onSelectVideo) {
      console.log('Auto-selecting uploaded media');
      onSelectVideo(newMedia);
    }
  };
  
  // Handle file input change
  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Show loading state
      setIsUploading(true);
      
      try {
        const file = e.target.files[0];
        console.log('Uploading file:', file.name, 'size:', file.size);
        
        // Determine the file type based on the active tab
        const mediaType = activeTab;
        
        // Call the parent component's handleFileUpload function
        // This should be passed down from App.js
        const mediaItem = await onFileUploaded(file, mediaType);
        console.log('File uploaded successfully:', mediaItem);
        
        // Reset the file input so the same file can be uploaded again
        e.target.value = null;
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file. Please try again.');
      } finally {
        // Hide loading state
        setIsUploading(false);
      }
    }
  };
  
  // Options menu handlers
  const openOptionsMenu = (event, videoId) => {
    setMenuAnchorEl(event.currentTarget);
    setActionVideoId(videoId);
  };
  
  const closeOptionsMenu = () => {
    setMenuAnchorEl(null);
    setActionVideoId(null);
  };

  // Get the appropriate accept attribute for file input based on active tab
  const getAcceptAttribute = () => {
    switch (activeTab) {
      case 'videos':
        return 'video/*';
      case 'photos':
        return 'image/*';
      case 'audio':
        return 'audio/*';
      default:
        return 'video/*,image/*,audio/*';
    }
  };
  
  // Debugging function to log the state of our media data
  useEffect(() => {
    console.log('Current uploadedMedia:', uploadedMedia);
    console.log('Current activeTab:', activeTab);
    console.log('Tab data:', uploadedMedia[activeTab]);
  }, [uploadedMedia, activeTab]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setFilterValue(e.target.value);
  };

  // Memoized filtered and sorted videos
  const processedVideos = React.useMemo(() => {
    // Get media from the current active tab
    const currentTabData = uploadedMedia && uploadedMedia[activeTab] ? uploadedMedia[activeTab] : [];
    
    // Use mainly the uploadedMedia as the source of truth
    let result = currentTabData;
    
    // Apply filtering based on file type
    if (activeTab === 'videos') {
      result = result.filter(item => 
        item.type === 'videos' || 
        (item.path && (item.path.endsWith('.mp4') || item.path.endsWith('.webm') || item.path.endsWith('.mov')))
      );
    } else if (activeTab === 'photos') {
      result = result.filter(item => 
        item.type === 'photos' || 
        (item.path && (item.path.endsWith('.jpg') || item.path.endsWith('.jpeg') || item.path.endsWith('.png') || item.path.endsWith('.gif')))
      );
    } else if (activeTab === 'audio') {
      result = result.filter(item => 
        item.type === 'audio' || 
        (item.path && (item.path.endsWith('.mp3') || item.path.endsWith('.wav') || item.path.endsWith('.aac')))
      );
    }
    
    // Apply search filter if there's a search term
    if (filterValue && filterValue.trim() !== '') {
      const searchTerm = filterValue.toLowerCase().trim();
      result = result.filter(item => {
        // Search in name
        if (item.name && item.name.toLowerCase().includes(searchTerm)) {
          return true;
        }
        // Can add more fields to search in if needed
        return false;
      });
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortOption === 'name') {
        return sortDirection === 'asc' 
          ? a.name?.localeCompare(b.name || '') 
          : b.name?.localeCompare(a.name || '');
      } else if (sortOption === 'duration' && activeTab === 'videos') {
        return sortDirection === 'asc' 
          ? (a.duration || 0) - (b.duration || 0) 
          : (b.duration || 0) - (a.duration || 0);
      } else { // default to 'modified'
        return sortDirection === 'asc' 
          ? (a.lastModified || 0) - (b.lastModified || 0) 
          : (b.lastModified || 0) - (a.lastModified || 0);
      }
    });
    
    return result;
  }, [activeTab, uploadedMedia, filterValue, sortOption, sortDirection]);
  
  // Handle videos
  const toggleFavorite = (videoId) => {
    // Toggle favorite status
    if (favorites.includes(videoId)) {
      setFavorites(favorites.filter(id => id !== videoId));
    } else {
      setFavorites([...favorites, videoId]);
    }
  };
  
  // Handle video hover
  const handleVideoHover = (videoId) => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoverVideo(videoId);
  };

  // Handle video hover end
  const handleVideoHoverEnd = () => {
    // Set timeout to hide the overlay
    const timeout = setTimeout(() => {
      setHoverVideo(null);
    }, 300);
    setHoverTimeout(timeout);
  };
  
  // Format duration for display
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle menu events
  const handleMoreClick = (event, videoId) => {
    event.stopPropagation();
    setActionVideoId(videoId);
    setMenuAnchorEl(event.currentTarget);
  };
  

  
  // Handle sort menu events
  const openSortMenu = (event) => {
    setSortMenuAnchorEl(event.currentTarget);
  };
  
  const closeSortMenu = () => {
    setSortMenuAnchorEl(null);
  };
  
  // Handle filter menu events
  const openFilterMenu = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };
  
  const closeFilterMenu = () => {
    setFilterMenuAnchorEl(null);
  };
  
  // Handle video operations
  const duplicateVideo = () => {
    console.log('Duplicate video:', actionVideoId);
    closeOptionsMenu();
  };
  
  const editVideo = () => {
    console.log('Edit video:', actionVideoId);
    closeOptionsMenu();
  };
  
  const deleteVideo = () => {
    console.log('Delete video:', actionVideoId);
    closeOptionsMenu();
  };
  
  
  // Format file size from bytes to KB, MB, etc
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);
  

  
  // Prepare our empty state check based on the processed videos
  const hasNoMedia = !videos || videos.length === 0;
  
  if (hasNoMedia) {
    return (
      <Box sx={{ 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        gap: 2
      }}>
        <Box sx={{
          p: 3,
          borderRadius: '50%',
          bgcolor: 'rgba(156, 39, 176, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
        }}>
          <CloudUploadIcon sx={{ fontSize: '2rem', color: '#9c27b0' }} />
        </Box>
        <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center', fontWeight: 500 }}>
          Upload {activeTab === 'videos' ? 'Video' : activeTab === 'photos' ? 'Photo' : 'Audio'}
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Button
            variant="contained" 
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              borderRadius: '24px',
              padding: '10px 24px',
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)'
            }}
          >
            Upload Media
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept={getAcceptAttribute()}
            onChange={handleFileInputChange}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Upload Area - Always visible section with improved responsive design */}
      <Box sx={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'rgba(18, 18, 22, 0.6)',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        border: '1px dashed rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <IconButton 
          onClick={() => fileInputRef.current?.click()} 
          sx={{ 
            bgcolor: 'rgba(156, 39, 176, 0.1)', 
            mb: 1.5,
            p: 1.5,
            transition: 'all 0.3s',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'rgba(156, 39, 176, 0.2)'
            }
          }}
        >
          <CloudUploadIcon sx={{ fontSize: '2rem', color: '#9c27b0' }} />
        </IconButton>
        
        <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Upload {activeTab === 'videos' ? 'Video' : activeTab === 'photos' ? 'Photo' : 'Audio'}
        </Typography>
        
        {/* Fix for the buttons - use container with no-wrap and scrollbar hidden */}
        <Box 
          sx={{
            display: 'flex',
            width: '100%',
            gap: 1,
            mb: 1.5,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            pb: 1
          }}
        >
          <Button 
            variant={activeTab === 'videos' ? 'contained' : 'outlined'}
            color={activeTab === 'videos' ? 'primary' : 'inherit'}
            onClick={() => onTabChange && onTabChange('videos')}
            startIcon={<VideocamIcon />}
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.75,
              minWidth: '90px',
              flex: '0 0 auto'
            }}
          >
            Video
          </Button>
          
          <Button 
            variant={activeTab === 'photos' ? 'contained' : 'outlined'}
            color={activeTab === 'photos' ? 'primary' : 'inherit'}
            onClick={() => onTabChange && onTabChange('photos')}
            startIcon={<PhotoIcon />}
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.75,
              minWidth: '90px',
              flex: '0 0 auto'
            }}
          >
            Photo
          </Button>
          
          <Button 
            variant={activeTab === 'audio' ? 'contained' : 'outlined'}
            color={activeTab === 'audio' ? 'primary' : 'inherit'}
            onClick={() => onTabChange && onTabChange('audio')}
            startIcon={<AudiotrackIcon />}
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.75,
              minWidth: '90px',
              flex: '0 0 auto'
            }}
          >
            Audio
          </Button>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ 
          textAlign: 'center', 
          px: { xs: 1, sm: 2 },
          fontSize: { xs: '0.65rem', sm: '0.75rem' }
        }}>
          Drag & drop files here or click to browse your device
        </Typography>
        
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept={getAcceptAttribute()}
          onChange={handleFileInputChange}
        />
      </Box>
      
      {/* Control toolbar - improved responsiveness */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(30, 30, 36, 0.8)', mb: 2 }}>
        <div className="search-container">
          <SearchIcon className="search-icon" />
          <input 
            type="text"
            placeholder="Search"
            className="search-input"
            value={filterValue}
            onChange={handleSearchChange}
          />
          {filterValue && (
            <div className="clear-icon" onClick={() => setFilterValue('')}>
              <CloseIcon fontSize="small" />
            </div>
          )}
        </div>
      </Paper>
      
      {/* Results info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
        {processedVideos.length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            {processedVideos.length} {activeTab === 'videos' ? (processedVideos.length === 1 ? 'video' : 'videos') : 
                                     activeTab === 'photos' ? (processedVideos.length === 1 ? 'photo' : 'photos') : 
                                     (processedVideos.length === 1 ? 'audio file' : 'audio files')} found
          </Typography>
        ) : null}
      </Box>
      
      {/* Video list */}
      {viewMode === 'grid' && (
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {processedVideos.length > 0 ? (
            processedVideos.map((video) => (
              <Grid item xs={12} sm={6} md={6} lg={6} key={video.id || video.name}>
                <div className="media-card-container">
                  <div 
                    className="media-card"
                    onMouseEnter={() => handleVideoHover(video.id || video.name)}
                    onMouseLeave={handleVideoHoverEnd}
                    onClick={() => onSelectVideo(video)}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify(video));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <div className="media-thumbnail" style={{ overflow: 'hidden', backgroundColor: '#121212', borderRadius: '8px' }}>
                      {(video.type === 'photos' || video.path?.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
                        <img 
                          src={`http://localhost:3001${video.path}` || '/placeholder-image.jpg'}
                          alt={video.name}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                          onError={(e) => {
                            console.error('Error loading image thumbnail', video.path);
                            e.target.src = 'https://placehold.co/600x400/9c27b0/white?text=Image';
                          }}
                        />
                      ) : (video.type === 'videos' || video.path?.match(/\.(mp4|webm|mov)$/i)) ? (
                        <div style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#121212'
                        }}>
                          {video.thumbnailPath ? (
                            <>
                              <img 
                                src={`http://localhost:3001${video.thumbnailPath}`} 
                                alt={video.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '8px'
                                }}
                                onError={(e) => {
                                  console.error('Error loading video thumbnail', video.thumbnailPath);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div style={{ 
                                position: 'absolute', 
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '8px'
                              }}>
                              </div>
                            </>
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#121212'
                            }}>
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="audio-card">
                          <AudiotrackIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="media-name">
                    {video.name}
                  </div>
                </div>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{
                p: 4,
                textAlign: 'center',
                color: 'text.secondary',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 2,
              }}>
                <Typography variant="body1" gutterBottom>
                  No {activeTab === 'videos' ? 'videos' : activeTab === 'photos' ? 'images' : activeTab === 'audio' ? 'audio files' : 'media'} found
                </Typography>
                <Typography variant="body2">
                  Upload {activeTab === 'videos' ? 'videos' : activeTab === 'photos' ? 'images' : activeTab === 'audio' ? 'audio files' : 'media'} or try a different search
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
      
      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchorEl}
        open={Boolean(sortMenuAnchorEl)}
        onClose={closeSortMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => { setSortOption('name'); setSortDirection('asc'); closeSortMenu(); }}
          selected={sortOption === 'name' && sortDirection === 'asc'}
        >
          <Typography variant="body2">Name (A-Z)</Typography>
        </MenuItem>
        <MenuItem 
          onClick={() => { setSortOption('name'); setSortDirection('desc'); closeSortMenu(); }}
          selected={sortOption === 'name' && sortDirection === 'desc'}
        >
          <Typography variant="body2">Name (Z-A)</Typography>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => { setSortOption('modified'); setSortDirection('desc'); closeSortMenu(); }}
          selected={sortOption === 'modified' && sortDirection === 'desc'}
        >
          <Typography variant="body2">Newest first</Typography>
        </MenuItem>
        <MenuItem 
          onClick={() => { setSortOption('modified'); setSortDirection('asc'); closeSortMenu(); }}
          selected={sortOption === 'modified' && sortDirection === 'asc'}
        >
          <Typography variant="body2">Oldest first</Typography>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => { setSortOption('duration'); setSortDirection('desc'); closeSortMenu(); }}
          selected={sortOption === 'duration' && sortDirection === 'desc'}
        >
          <Typography variant="body2">Longest first</Typography>
        </MenuItem>
        <MenuItem 
          onClick={() => { setSortOption('duration'); setSortDirection('asc'); closeSortMenu(); }}
          selected={sortOption === 'duration' && sortDirection === 'asc'}
        >
          <Typography variant="body2">Shortest first</Typography>
        </MenuItem>
      </Menu>
      
      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeOptionsMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={editVideo}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Edit</Typography>
        </MenuItem>
        <MenuItem onClick={duplicateVideo}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Duplicate</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={deleteVideo} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Delete</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default VideoList;