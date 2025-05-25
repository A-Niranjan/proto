import React, { useState, useEffect, useCallback } from 'react';
import { uploadFile, getAllMedia, deleteTempFile, clearTempFiles } from './utils/apiClient';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  useMediaQuery, 
  IconButton,
  Snackbar,
  Alert as MuiAlert,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoIcon from '@mui/icons-material/Photo';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import SendIcon from '@mui/icons-material/Send';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ExportIcon from '@mui/icons-material/FileDownload';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import ChatIcon from '@mui/icons-material/Chat';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MovieIcon from '@mui/icons-material/Movie';
import './App.css';

// Import components
import VideoUploader from './components/VideoUploader';
import VideoList from './components/VideoList';
import VideoPreview from './components/VideoPreview';
import ChatBox from './components/ChatBox';

// Create a theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#9c27b0', // Purple
      light: '#d05ce3',
      dark: '#6a0080',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff3d00',
      light: '#ff7539',
      dark: '#c30000',
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212', // True black background
      paper: '#1e1e1e',  // Darker paper for UI elements
    },
    success: {
      main: '#00c853',
    },
    info: {
      main: '#00b0ff',
    },
    error: {
      main: '#f44336',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    }
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.2)',
    '0px 4px 8px rgba(0, 0, 0, 0.2)',
    '0px 8px 16px rgba(0, 0, 0, 0.2)',
    '0px 12px 24px rgba(0, 0, 0, 0.2)',
    '0px 16px 32px rgba(0, 0, 0, 0.2)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.3)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #9c27b0 30%, #d05ce3 90%)',
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #ff3d00 30%, #ff7539 90%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
          backgroundColor: '#1e2632',
        },
        elevation1: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          backgroundColor: '#1e2632',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
        },
      },
    },
  },
});

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState('videos');
  const [mediaOpen, setMediaOpen] = useState(false); 
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false); 
  const [activePanel, setActivePanel] = useState('media');
  const [newMessage, setNewMessage] = useState('');
  
  // State for uploaded media
  const [uploadedMedia, setUploadedMedia] = useState({
    videos: [],
    photos: [],
    audio: []
  });
  
  // Function to load media from server
  const loadServerMedia = async () => {
    try {
      const serverMedia = await getAllMedia();
      setUploadedMedia(serverMedia);
      console.log('Loaded media from server:', serverMedia);
      return serverMedia;
    } catch (error) {
      console.error('Error loading media from server:', error);
      return { videos: [], photos: [], audio: [] };
    }
  };
  
  // Load saved media from server on component mount
  useEffect(() => {
    loadServerMedia();
    // Fetch media periodically to check for updates
    const intervalId = setInterval(loadServerMedia, 5000);
    return () => clearInterval(intervalId);
  }, []); 
  
  // Clean up temp files on component unmount
  useEffect(() => {
    return () => {
      // Clear all temporary files when the app closes
      clearTempFiles().catch(err => console.error('Error clearing temp files:', err));
    };
  }, []);
  
  // Project title state
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  
  // Check different screen sizes
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Toggle media panel - modified to not hide when clicking media button again
  const toggleMediaPanel = () => {
    // Always set to true to ensure it's visible
    setMediaOpen(true);
    setActivePanel('media');
    if (isSmallMobile && rightSidebarOpen) setRightSidebarOpen(false); 
  };
  
  // Handle video selection
  const onVideoSelect = async (video) => {
    // If there's a currently selected video that's marked as temporary, clean it up
    if (selectedVideo && selectedVideo.isTemp && selectedVideo.path) {
      try {
        // Get the filename from the path
        const filename = selectedVideo.path.split('/').pop();
        await deleteTempFile(filename);
        console.log('Removed temporary file:', filename);
      } catch (error) {
        console.error('Error removing temporary file:', error);
      }
    }
    
    // If this is a dropped video, save a copy to temp storage
    if (video && video.isDropped) {
      try {
        // For dropped videos that have a file path, we need to first fetch the file
        const response = await fetch(`http://localhost:5000${video.path}`);
        if (!response.ok) throw new Error('Could not fetch file');
        
        // Convert to a blob
        const blob = await response.blob();
        const file = new File([blob], video.name, { type: video.mimeType || 'video/mp4' });
        
        // Upload to temp storage
        const tempMedia = await uploadFile(file, true);
        console.log('Saved temp file from drop:', tempMedia);
        
        // Use the temp copy
        video = tempMedia;
      } catch (error) {
        console.error('Error creating temp file from drop:', error);
      }
    }
    
    setSelectedVideo(video);
    if (isSmallMobile) setMediaOpen(false);
  };

  // Handle tab change in media panel
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Toggle right sidebar panel
  const toggleRightSidebar = () => {
    setRightSidebarOpen(!rightSidebarOpen);
    if (isSmallMobile && mediaOpen) setMediaOpen(false); 
  };

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, []);

  // Track the latest request being processed
  const [currentRequestId, setCurrentRequestId] = useState(null);
  
  // Start polling for chat responses when needed
  useEffect(() => {
    let pollingTimeout;
    
    const pollForResponse = async () => {
      if (!isPolling) return;
      
      try {
        await fetchChatResponse();
        
        // Only set up the next poll if we're still waiting for a response
        if (isPolling) {
          pollingTimeout = setTimeout(pollForResponse, 1000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // If there's an error, still continue polling but with a longer delay
        if (isPolling) {
          pollingTimeout = setTimeout(pollForResponse, 2000);
        }
      }
    };
    
    // Start polling if needed
    if (isPolling) {
      pollForResponse();
    }
    
    return () => {
      if (pollingTimeout) clearTimeout(pollingTimeout);
    };
  }, [isPolling]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos');
      setVideos(response.data);
      
      // Select the most recently modified video
      if (response.data.length > 0 && !selectedVideo) {
        setSelectedVideo(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  // Handle file upload from VideoList component
  const handleFileUpload = async (file, mediaType) => {
    try {
      console.log(`Uploading ${mediaType} file:`, file.name);
      
      // Upload the file
      const mediaItem = await uploadFile(file, false);
      console.log('Media item uploaded successfully:', mediaItem);
      
      // Add to uploaded media array based on type
      setUploadedMedia(prev => {
        console.log('Previous media state:', prev);
        const newState = {
          ...prev,
          [mediaItem.type]: [...(prev[mediaItem.type] || []), mediaItem]
        };
        console.log('New media state:', newState);
        return newState;
      });
      
      return mediaItem;
    } catch (error) {
      console.error('Error handling file upload:', error);
      alert(`Error uploading file: ${error.message}`);
      
      // Fallback if server upload fails
      const fallbackMedia = {
        id: Date.now().toString(),
        name: file.name,
        path: URL.createObjectURL(file),
        type: mediaType || (file.type.startsWith('image/') ? 'photos' : 
               file.type.startsWith('audio/') ? 'audio' : 'videos'),
        size: file.size,
        lastModified: file.lastModified
      };
      
      // Add fallback media to state
      setUploadedMedia(prev => ({
        ...prev,
        [fallbackMedia.type]: [...(prev[fallbackMedia.type] || []), fallbackMedia]
      }));
      
      console.log('Using fallback local URL method for media', fallbackMedia);
      return fallbackMedia;
    }
  };
  
  // Helper to determine media type from file
  const determineMediaType = (file) => {
    if (file.type.startsWith('video/')) return 'videos';
    if (file.type.startsWith('image/')) return 'photos';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'videos'; // Default
  };

  const handleVideoUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Refresh video list
      fetchVideos();
      // Set the newly uploaded video as selected
      setSelectedVideo(response.data);
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  // Function to clear chat messages
  const clearChat = () => {
    setChatMessages([]);
  };

  // Track the request IDs we've already processed
  const [processedRequestIds, setProcessedRequestIds] = useState(new Set());
  
  const fetchChatResponse = async () => {
    try {
      // If we're not currently waiting for a response, don't poll
      if (!isPolling) return;
      
      const response = await axios.get('/api/chat/response');
      
      if (response.data.role === 'assistant') {
        // Check if we have a request ID and haven't processed this response yet
        const requestId = response.data.request_id;
        
        // Only process this response if:
        // 1. It has a request ID that we haven't seen before, OR
        // 2. It matches our current request ID (which means it's the response we're waiting for)
        if (requestId && !processedRequestIds.has(requestId)) {
          console.log(`New response received with request ID: ${requestId}`);
          
          // Update our tracking of processed request IDs
          setProcessedRequestIds(prev => new Set([...prev, requestId]));
          
          // Add the new message to chat if it's not already there
          setChatMessages(prev => {
            // Check if this message is already in the chat history
            const messageExists = prev.some(msg => 
              msg.role === 'assistant' && msg.request_id === requestId);
              
            // Only add if it's not already there
            return messageExists ? prev : [...prev, response.data];
          });
          
          // Stop polling once we have a response for our current request
          if (requestId === currentRequestId) {
            setIsPolling(false);
            console.log(`Got response for current request: ${requestId}`);
          }
          
          // If the response contains a video name, refresh the videos list
          // and check if we need to update the selected video
          if (response.data.content.includes('processed') || 
              response.data.content.includes('created') ||
              response.data.content.includes('edited')) {
            await fetchVideos();
          }
        } else if (!requestId) {
          console.log('Response missing request ID, using timestamp as fallback');
          // Fallback to timestamp if no request ID (for backward compatibility)
          const responseTimestamp = response.data.timestamp || 0;
          const lastMessage = chatMessages[chatMessages.length - 1];
          const lastTimestamp = lastMessage?.timestamp || 0;
          
          if (responseTimestamp > lastTimestamp) {
            setChatMessages(prev => [...prev, response.data]);
            setIsPolling(false);
          }
        } else {
          console.log(`Ignoring duplicate response with request ID: ${requestId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching chat response:', error);
    }
  };

  const handleSendMessage = async (message) => {
    // Check if this is a video-related command and we have a selected video
    const videoCommands = [
      'analyze', 'get info', 'trim', 'extract', 'split', 'fade', 'add watermark',
      'convert', 'merge', 'overlay', 'transform', 'process', 'get video info'
    ];
    
    // Placeholder for the processed message that might include the video path
    let processedMessage = message;
    let includesVideoPath = false;
    
    // Check if the message already includes a file path
    const hasFilePath = /[A-Za-z]:\\|[A-Za-z]:/.test(message);
    
    // If we have a selected video and the message includes a video command
    if (selectedVideo) {
      const lowerMessage = message.toLowerCase();
      const isVideoCommand = videoCommands.some(cmd => lowerMessage.includes(cmd));
      
      if (isVideoCommand) {
        // Whether or not we already have a file path, we'll ensure we use the local file path
        // from the server rather than the API URL path
        includesVideoPath = true;
        
        // Instead of adding the path to the message, we'll pass it separately to the backend
        // in the videoContext object, and let the backend handle converting the path
        console.log(`Using currently loaded video for this command: ${selectedVideo.name}`);
        
        // Show notification that we're using the current video
        showNotification('Using currently loaded video for this command', 'info');
      }
    }
    
    // Add message to chat (show original message to user)
    const userMessage = {
      role: 'user',
      content: message, // Show original message to user
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsPolling(true);
    
    try {
      // Generate a unique request ID for this message so we can track it
      const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;  
      setCurrentRequestId(requestId); // Store this request ID
      
      console.log(`Sending message with request ID: ${requestId}`);
      
      // Send the processed message (with video path if applicable)
      const response = await axios.post('/api/chat', { 
        message: processedMessage,
        videoContext: includesVideoPath ? selectedVideo : null
      });
      
      // If we get an immediate response (rare but possible)
      if (response.data && response.data.assistant) {
        // First check if we already have this response by its request ID
        const existingMsgIndex = chatMessages.findIndex(msg => 
          msg.request_id === response.data.assistant.request_id);
          
        if (existingMsgIndex === -1) {
          // Add to chat messages if it's new
          setChatMessages(prev => [...prev, response.data.assistant]);
          // Add to processed IDs
          setProcessedRequestIds(prev => new Set([...prev, response.data.assistant.request_id]));
        }
      
        // Check if the response includes an output video path
        const assistantContent = response.data.assistant.content;
        if (assistantContent) {
          // Look for output file paths in the response
          const outputPathMatch = assistantContent.match(/output(?:Path|File)\s*:\s*"?([^"\s,\n]+)"?/i) ||
                                assistantContent.match(/saved(?:\s+to)?\s*:?\s*"?([^"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))"?/i) ||
                                assistantContent.match(/successfully\s+(?:created|generated|processed)\s+"?([^"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))"?/i);
          
          if (outputPathMatch && outputPathMatch[1]) {
            const outputPath = outputPathMatch[1];
            console.log(`Detected output video path: ${outputPath}`);
            
            // Load the newly created video
            try {
              // Force a refresh of media files
              await loadServerMedia();
              
              // Find the video in the updated list
              const fileName = outputPath.split(/[\\/]/).pop(); // Get the filename
              const video = uploadedMedia.videos.find(v => v.url.includes(fileName));
              
              if (video) {
                // Add isDropped flag so it shows in the preview
                video.isDropped = true;
                onVideoSelect(video);
                showNotification(`Loaded processed video: ${fileName}`, 'success');
              } else {
                // If we couldn't find it, try again after a delay
                setTimeout(async () => {
                  const refreshedMedia = await loadServerMedia();
                  const video = refreshedMedia.videos.find(v => v.url.includes(fileName));
                  if (video) {
                    video.isDropped = true;
                    onVideoSelect(video);
                    showNotification(`Loaded processed video: ${fileName}`, 'success');
                  }
                }, 1000);
              }
            } catch (error) {
              console.error('Error loading processed video:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      // Show error notification
      showNotification('Failed to send message. Please try again.', 'error');
    } finally {
      setIsPolling(false);
    }
  };

  // Show a notification toast
  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Handle export/download of media
  const handleExport = () => {
    if (!selectedVideo) {
      // Show notification if no video is selected
      showNotification('Please select a media file to export', 'warning');
      return;
    }
    
    // Try different approaches to get the proper URL to the raw media file
    let downloadUrl = '';
    
    // First check if there's a direct raw file URL available
    if (selectedVideo.raw_url) {
      downloadUrl = selectedVideo.raw_url;
    }
    // Next try the url property
    else if (selectedVideo.url) {
      downloadUrl = selectedVideo.url;
    }
    // Finally try to construct from path
    else if (selectedVideo.path) {
      // Use a direct file access URL structure to bypass any HTML rendering
      // This assumes a specific API structure where /api/download/ directly serves the file
      downloadUrl = `/api/download/${encodeURIComponent(selectedVideo.path)}`;
    }
    
    if (!downloadUrl) {
      showNotification('Download URL not available', 'error');
      return;
    }
    
    // For local files that are directly accessible, try a direct download approach
    if (selectedVideo.file) {
      try {
        // If we have the actual File object available
        const url = URL.createObjectURL(selectedVideo.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedVideo.name || 'media-export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      } catch (error) {
        console.error('Error creating object URL from file:', error);
        // Continue to fallback methods
      }
    }
    
    // Fix the downloadUrl path - remove any double path elements
    // The issue might be that the path already contains /api/ and we're adding it again
    let cleanUrl = downloadUrl;
    if (downloadUrl.includes('/api/') && selectedVideo.path && selectedVideo.path.startsWith('/api/')) {
      // If both the URL and the path start with /api/, fix the path to avoid duplication
      cleanUrl = selectedVideo.path;
    }
    
    // Always use fetch to get the file as a blob first, which ensures proper download
    fetch(cleanUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Get the file extension from the path or URL
        const getFileExtension = (url) => {
          const match = url.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
          return match ? match[1] : '';
        };
        
        // Try to get the extension from the path or URL
        const fileExt = getFileExtension(selectedVideo.name || selectedVideo.path || cleanUrl);
        
        // Create a filename with the proper extension
        const fileName = selectedVideo.name || `media-export${fileExt ? `.${fileExt}` : ''}`;
        
        // Create a blob URL for the media content
        const blobUrl = URL.createObjectURL(blob);
        
        // Create an anchor element for download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        
        // Click and clean up
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 100);
      })
      .catch(error => {
        console.error('Download failed:', error);
        showNotification('Download failed', 'error');
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-container">
        {/* Header - improved with export button, editable title & project name */}
        <div className="header">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 2 }}>
            {/* Left side - menu and logo */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isSmallMobile && (
                <IconButton color="inherit" onClick={toggleMediaPanel} sx={{ mr: 1 }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
                color: 'primary.main',
                letterSpacing: '0.5px'
              }}>
                VIDEO EDITOR
              </Typography>
            </Box>
            
            {/* Center - editable project title */}
            <Box sx={{ 
              position: { xs: 'relative', sm: 'absolute' },
              left: { xs: 'auto', sm: '50%' },
              transform: { xs: 'none', sm: 'translateX(-50%)' },
              display: { xs: 'none', sm: 'block' }
            }}>
              <TextField
                variant="standard"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                sx={{ 
                  input: { 
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '1rem',
                    color: 'text.primary',
                    '&:hover': {
                      cursor: 'pointer'
                    }
                  },
                  '& .MuiInput-underline:before': { 
                    borderBottom: 'none' 
                  },
                  '& .MuiInput-underline:hover:before': { 
                    borderBottom: '1px solid rgba(255,255,255,0.2)' 
                  },
                  '& .MuiInput-underline:after': { 
                    borderBottom: '2px solid #9c27b0' 
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" sx={{ opacity: 0.6 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ExportIcon />}
                size="small"
                onClick={handleExport}
                sx={{
                  borderRadius: '20px',
                  textTransform: 'none',
                  px: 2,
                  py: 0.75,
                  fontWeight: 500,
                  boxShadow: '0 2px 10px rgba(156, 39, 176, 0.3)',
                  '&:hover': {
                    boxShadow: '0 4px 15px rgba(156, 39, 176, 0.4)',
                  }
                }}
              >
                Export
              </Button>
              
              {isSmallMobile && (
                <IconButton onClick={toggleRightSidebar} sx={{ color: 'rgba(255,255,255,0.7)', ml: 1 }}>
                  <ChatIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </div>
        
        {/* App Body containing sidebars and main content */}
        <div className="app-body">
          {/* Navigation Sidebar */}
          <div className="left-sidebar">
            <div className="nav-sidebar">
              <div className={`sidebar-icon ${activePanel === 'videos' ? 'active' : ''}`} onClick={() => {
                setActivePanel('videos');
                setActiveTab('videos');
                setMediaOpen(true);
              }}>
                <VideocamIcon />
                <span>VIDEOS</span>
              </div>
              <div className={`sidebar-icon ${activePanel === 'photos' ? 'active' : ''}`} onClick={() => {
                setActivePanel('photos');
                setActiveTab('photos');
                setMediaOpen(true);
              }}>
                <PhotoIcon />
                <span>PHOTOS</span>
              </div>
              <div className={`sidebar-icon ${activePanel === 'audio' ? 'active' : ''}`} onClick={() => {
                setActivePanel('audio');
                setActiveTab('audio');
                setMediaOpen(true);
              }}>
                <AudiotrackIcon />
                <span>AUDIO</span>
              </div>
              <div className={`sidebar-icon ${activePanel === 'text' ? 'active' : ''}`} onClick={() => setActivePanel('text')}>
                <TextFieldsIcon />
                <span>TEXT</span>
              </div>
              <div className={`sidebar-icon ${activePanel === 'captions' ? 'active' : ''}`} onClick={() => setActivePanel('captions')}>
                <SubtitlesIcon />
                <span>CAPTIONS</span>
              </div>
            </div>
          </div>
          
          {/* Media Panel (expanded content for media browser) - always visible */}
          <div className={`media-panel ${!mediaOpen && isSmallMobile ? 'hidden' : ''}`}>
            <VideoList
              videos={uploadedMedia[activeTab]}
              selectedVideo={selectedVideo}
              onSelectVideo={onVideoSelect}
              onTabChange={handleTabChange}
              activeTab={activeTab}
              setUploadedMedia={setUploadedMedia}
              uploadedMedia={uploadedMedia}
              onFileUploaded={handleFileUpload}
            />
          </div>
          
          {/* Main Content - Video Preview with Drop Zone */}
          <div 
            className="main-content"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = 'rgba(156, 39, 176, 0.08)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.backgroundColor = '';
              try {
                // Try to get data from application/json format first
                const jsonData = e.dataTransfer.getData('application/json');
                if (jsonData) {
                  const videoData = JSON.parse(jsonData);
                  // Add isDropped flag to show it in the preview
                  videoData.isDropped = true;
                  onVideoSelect(videoData);
                  return;
                }
                
                // Fall back to text/plain if application/json is not available
                const textData = e.dataTransfer.getData('text/plain');
                if (textData) {
                  const videoData = JSON.parse(textData);
                  // Add isDropped flag to show it in the preview
                  videoData.isDropped = true;
                  onVideoSelect(videoData);
                }
              } catch (error) {
                console.error('Error parsing dropped item:', error);
              }
            }}
          >
            <VideoPreview 
              video={selectedVideo} 
              onVideoEnd={() => console.log('Video ended')} 
            />
            {!selectedVideo && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                p: 3,
                borderRadius: 2,
                border: '2px dashed rgba(156, 39, 176, 0.3)',
                bgcolor: 'rgba(156, 39, 176, 0.05)',
                width: '80%',
                maxWidth: '500px'
              }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Drag & Drop Media Here
                </Typography>
                <Typography variant="body2">
                  Select media from the panel or drag items directly to this area
                </Typography>
              </Box>
            )}
          </div>
          
          {/* Right Sidebar - Chat Interface */}
          <div className={`right-sidebar ${isSmallMobile && rightSidebarOpen ? 'open' : ''}`}>
            <ChatBox 
              messages={chatMessages} 
              onSendMessage={handleSendMessage} 
              isTyping={isPolling}
              onNewChat={clearChat}
            />
          </div>
        </div> {/* End of app-body */}

        {/* Mobile Navigation Bar */}
        {isSmallMobile && (
          <div className="mobile-nav">
            <IconButton color="inherit" onClick={toggleMediaPanel} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: mediaOpen ? 'primary.main' : 'rgba(255,255,255,0.7)' }}>
              <FolderOpenIcon />
              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Media</Typography>
            </IconButton>
            <IconButton color="inherit" onClick={() => console.log("Timeline/Editor placeholder")} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'rgba(255,255,255,0.7)' }}>
              <MovieIcon /> 
              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Edit</Typography>
            </IconButton>
            <IconButton color="inherit" onClick={toggleRightSidebar} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: rightSidebarOpen ? 'primary.main' : 'rgba(255,255,255,0.7)' }}>
              <ChatIcon />
              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Chat</Typography>
            </IconButton>
            {/* Add more icons as needed, e.g., for main actions or settings */}
          </div>
        )}

        {/* Notifications */}
        <Snackbar 
          open={notification.open} 
          autoHideDuration={4000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert 
            onClose={handleCloseNotification} 
            severity={notification.severity} 
            sx={{ width: '100%', borderRadius: 3 }}
            elevation={3}
          >
            {notification.message}
          </MuiAlert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}

export default App;
