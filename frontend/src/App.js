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
  
  // Load a specific video into the preview by its filename or pattern
  // showNotification parameter controls whether to show notifications (default: false)
  const loadVideoByFilename = async (filenamePattern, showNotification = false, retryCount = 0) => {
    console.log(`Attempting to load video matching pattern: ${filenamePattern}`);
    
    // First, refresh our media list to ensure we have the latest files
    try {
      console.log('Refreshing media list before searching for video');
      await loadServerMedia();
    } catch (err) {
      console.error('Error refreshing media list:', err);
    }
    
    // Special case for output.mp4 or audio-merged files
    const isOutputMp4 = filenamePattern === 'output.mp4';
    const isAudioMergedFile = filenamePattern.includes('_with_audio') || filenamePattern.includes('-with-audio') || filenamePattern.includes('_audio_enhanced');
    const isProcessedOutput = filenamePattern.includes('-output') || filenamePattern.includes('_output') || filenamePattern.includes('_processed') || filenamePattern.includes('_trimmed') || filenamePattern.includes('_enhanced') || filenamePattern.includes('_filtered') || filenamePattern.includes('_batman') || filenamePattern.includes('_madmax') || filenamePattern.includes('_instagram');
    const isTimestampedOutput = /^\d{10,}\-.*\.(mp4|mov|avi|webm|mkv)$/.test(filenamePattern);
    
    try {
      // For output.mp4, directly check temp folder via API
      if (isOutputMp4) {
        console.log('Looking specifically for output.mp4 in temp folder');
        try {
          // Try to fetch the video directly from temp folder
          const response = await axios.get('/api/temp/output.mp4', { responseType: 'blob' });
          if (response.status === 200) {
            console.log('Found output.mp4 in temp folder, creating virtual video object');
            // Create a virtual video object
            const video = {
              id: 'temp-output',
              name: 'output.mp4',
              path: '/api/temp/output.mp4',
              type: 'videos',
              isDropped: true, // This flag makes it show in preview
              size: response.data.size || 0,
              lastModified: Date.now()
            };
            
            // Load it into preview
            onVideoSelect(video);
            showNotification('Loaded merged video', 'success');
            return true;
          }
        } catch (error) {
          console.log('Could not find output.mp4 in temp folder via direct access');
        }
      }
      
      // Special handling for audio-merged files and other processed files that might be in the uploads/videos folder
      if (isAudioMergedFile || isProcessedOutput) {
        console.log('Looking specifically for processed output file in videos folder');
        try {
          // Try loading server media first to get the latest list (already done above)
          const mediaList = await getAllMedia();
          
          // First look for exact match on the filename
          let processedVideo = mediaList.videos.find(v => v.name === filenamePattern);
          
          // Next, check for the most recent file with matching patterns (usually what we want)
          if (!processedVideo) {
            // Sort videos by timestamp (newest first)
            const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
            
            // Look for the most recent file that matches any of our patterns
            processedVideo = sortedVideos.find(v => 
              (isAudioMergedFile && (v.name.includes('_with_audio') || v.name.includes('-with-audio') || v.name.includes('_audio_enhanced'))) ||
              (isProcessedOutput && (v.name.includes('-output') || v.name.includes('_output'))) ||
              v.name.includes('_processed') || 
              v.name.includes('_trimmed') ||
              v.name.includes('_enhanced') ||
              v.name.includes('_filtered') ||
              v.name.includes('_batman') ||
              v.name.includes('_madmax') ||
              // More specific pattern matching for timestamps
              v.name.match(/^\d+\-output/) ||
              v.name.match(/^\d+\-.*_with_audio/) ||
              v.name.match(/^\d+\-.*_audio_enhanced/) ||
              v.name.match(/^\d+\-.*_enhanced/) ||
              v.name.match(/^\d+\-.*_filtered/) ||
              // Most general case: any file with a timestamp prefix
              v.name.match(/^\d{10,}\-[^\s]*\.(mp4|mov|avi|webm|mkv)$/)
            );
          }
          
          // If that fails, try the most recent video file as a fallback
          if (!processedVideo && mediaList.videos.length > 0) {
            console.log('No exact match found, checking most recent videos');
            const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
            processedVideo = sortedVideos[0]; // Most recent video
          }
          
          if (processedVideo) {
            console.log(`Found processed video: ${processedVideo.name}`);
            processedVideo.isDropped = true; // Mark as droppable so it shows in preview
            onVideoSelect(processedVideo, false); // Don't show notifications
            return true;
          } else if (isTimestampedOutput || filenamePattern.match(/^\d{10,}\-[^\s]*\.(mp4|mov|avi|webm|mkv)$/)) {
            // Special case for timestamped output files
            console.log('Looking for any timestamped output file');
            // Get the most recent video with a timestamp prefix
            const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
            const mostRecentTimestamped = sortedVideos.find(v => v.name.match(/^\d{10,}\-[^\s]*\.(mp4|mov|avi|webm|mkv)$/));
            
            if (mostRecentTimestamped) {
              console.log(`Found timestamped output video: ${mostRecentTimestamped.name}`);
              mostRecentTimestamped.isDropped = true;
              onVideoSelect(mostRecentTimestamped, false); // Don't show notifications
              return true;
            }
          } else {
            console.log('Could not find any matching processed videos');
          }
        } catch (error) {
          console.error('Error searching for processed file:', error);
        }
      }
    } catch (error) {
      console.error('Error checking for special files:', error);
    }
    
    // Force a refresh of media first
    const mediaList = await loadServerMedia();
    
    if (!mediaList || !mediaList.videos || mediaList.videos.length === 0) {
      console.log('No videos available in media list');
      if (retryCount < 3) {
        console.log(`Retrying in 1 second (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadVideoByFilename(filenamePattern, retryCount + 1), 1000);
      }
      return false;
    }
    
    console.log(`Searching through ${mediaList.videos.length} videos for match`);
    
    // Try exact match first
    let video = mediaList.videos.find(v => v.name === filenamePattern);
    
    // If no exact match, try to find by includes
    if (!video) {
      video = mediaList.videos.find(v => v.name.includes(filenamePattern));
    }
    
    // If still no match, try matching just the base name (without the timestamp prefix)
    if (!video && filenamePattern.includes('-')) {
      const baseNameParts = filenamePattern.split('-');
      if (baseNameParts.length > 1) {
        const baseName = baseNameParts.slice(1).join('-');
        video = mediaList.videos.find(v => v.name.includes(baseName));
      }
    }
    
    // For output.mp4, try to find any recently processed videos
    if (!video && isOutputMp4) {
      // Look for any recently processed videos - sort by lastModified (newest first)
      const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
      if (sortedVideos.length > 0) {
        // Try the most recent video
        video = sortedVideos[0];
        console.log(`No exact match found for output.mp4, using most recent video: ${video.name}`);
      }
    }
    
    if (video) {
      console.log(`Found matching video: ${video.name}`);
      // Add isDropped flag so it shows in the preview
      video.isDropped = true;
      onVideoSelect(video);
      showNotification(`Loaded video: ${video.name}`, 'success');
      return true;
    } else {
      console.log('No matching video found');
      if (retryCount < 3) {
        console.log(`Retrying in 1 second (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadVideoByFilename(filenamePattern, retryCount + 1), 1000);
      }
      return false;
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
          
          // If the response contains text that suggests a video processing operation has completed,
          // refresh the videos list and load the processed video into the preview
          if (response.data.content.includes('processed') || 
              response.data.content.includes('created') ||
              response.data.content.includes('edited') ||
              response.data.content.includes('merged') ||
              response.data.content.includes('trimmed') ||
              response.data.content.includes('extracted') ||
              response.data.content.includes('saved to') ||
              response.data.content.includes('output.mp4') ||
              response.data.content.includes('_with_audio') ||
              response.data.content.includes('-with-audio') ||
              response.data.content.includes('operation was performed successfully') ||
              response.data.content.includes('successfully')) {
                
            console.log('Processing result detected in response, refreshing videos');
            await fetchVideos();
              
            // Look for output file patterns in the response
            const content = response.data.content;
            // Enhanced pattern matching for finding output filenames
            const outputPathMatch = content.match(/output(?:Path|File)\s*:\s*"?([^"\s,\n]+)"?/i) ||
                               content.match(/saved(?:\s+(?:as|to))?\s*:?\s*"?([^"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))"?/i) ||
                               content.match(/successfully\s+(?:created|generated|processed|trimmed|converted|saved|merged)\s+(?:as\s+|into\s+)?`?"?([^`"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))`?"?/i) ||
                               content.match(/(?:trimmed|processed|exported|created|merged).*?(?:saved\s+as|as|into)\s+`?"?([^`"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))`?"?/i) ||
                               content.match(/output is in\s+`([^`]+)`/i) ||
                               content.match(/merged.*?output is in\s+`([^`]+)`/i) ||
                               content.match(/have been successfully merged.*?`([^`]+)`/i) ||
                               content.match(/merged into `([^`]+)`/i) ||
                               content.match(/into `([^`]+)`/i) ||
                               content.match(/output\.mp4/i) ? ['output.mp4', 'output.mp4'] : null ||
                               content.match(/([^\s,\n]+_with_audio\.(?:mp4|mov|avi|webm|mkv))/i) ||
                               content.match(/([^\s,\n]+output_with_audio\.(?:mp4|mov|avi|webm|mkv))/i) ||
                               content.match(/([^\s,\n]+\d{10,}_output[^\s]*\.(?:mp4|mov|avi|webm|mkv))/i) ||
                               content.match(/([^\s,\n]+_(?:audio_enhanced|filtered|processed|batman|madmax|rotated|flipped|cropped|resized|segmented)\.(?:mp4|mov|avi|webm|mkv))/i) ||
                               content.match(/"([^"\s,\n]+_trimmed\.(?:mp4|mov|avi|webm|mkv))"/i);
              
            if (outputPathMatch && outputPathMatch[1]) {
              const outputFile = outputPathMatch[1];
              console.log(`Detected output file in response: ${outputFile}`);
              // Attempt to load this video into the preview without notifications
              setTimeout(() => loadVideoByFilename(outputFile, false), 500);
            } else {
              console.log('No specific output file detected, will attempt to load most recent video');
              // If no specific file was mentioned, try to load the most recent processed video
              setTimeout(async () => {
                try {
                  // Fetch latest media list
                  const mediaList = await loadServerMedia();
                  if (mediaList && mediaList.videos && mediaList.videos.length > 0) {
                    // Sort by timestamp and load the most recent one
                    const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
                    
                    // First try to find the most recent processed video
                    const recentProcessed = sortedVideos.find(v => 
                      v.name.includes('output') || 
                      v.name.includes('_processed') || 
                      v.name.includes('_trimmed') || 
                      v.name.includes('_with_audio') || 
                      v.name.includes('-with-audio') ||
                      v.name.includes('_enhanced') ||
                      v.name.includes('_filtered') ||
                      v.name.includes('_batman') ||
                      v.name.includes('_madmax') ||
                      v.name.match(/^\d{10,}\-[^\s]*\.(mp4|mov|avi|webm|mkv)$/)
                    );
                    
                    // Use processed video if found, otherwise use most recent
                    const videoToLoad = recentProcessed || sortedVideos[0];
                    console.log(`Loading ${recentProcessed ? 'most recent processed' : 'most recent'} video: ${videoToLoad.name}`);
                    videoToLoad.isDropped = true;
                    // Load video silently without notifications
                    onVideoSelect(videoToLoad, false);
                  }
                } catch (err) {
                  console.error('Error loading most recent video:', err);
                }
              }, 1000);
            }
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

  const findAudioFileByName = async (fileName) => {
    try {
      const response = await axios.get(`/api/audio/${fileName}`);
      return response.data;
    } catch (error) {
      console.error('Error finding audio file:', error);
      return null;
    }
  };

  // Function to find an audio file by name in the uploaded media
  const findAudioFile = (audioFileName) => {
    // Check if we have audio files in the uploaded media
    if (!uploadedMedia || !uploadedMedia.audio || !uploadedMedia.audio.length) {
      return null;
    }
    
    // Normalize the filename for comparison
    const normalizedFileName = audioFileName.toLowerCase().trim();
    
    // Search for audio files that match the name
    const matchingAudio = uploadedMedia.audio.find(audio => {
      // Check if the audio name matches (case insensitive)
      const audioName = audio.name.toLowerCase();
      
      // Check for exact match or partial match
      return audioName === normalizedFileName ||
             audioName.includes(normalizedFileName) ||
             // Handle case where user didn't include file extension
             (audioName.split('.')[0] === normalizedFileName) ||
             audioName.split('.')[0].includes(normalizedFileName);
    });
    
    return matchingAudio;
  };
  
  const handleSendMessage = async (message) => {
    // Check if this is a video-related command and we have a selected video
    const videoCommands = [
      'analyze', 'get info', 'trim', 'extract', 'split', 'fade', 'add watermark',
      'convert', 'merge', 'overlay', 'transform', 'process', 'get video info',
      'filter', 'apply filter', 'batman filter', 'apply batman filter', 'blur', 'sharpen', 'rotate',
      'flip', 'mirror', 'crop', 'resize', 'adjust', 'speed', 'slow', 'fast', 'reverse',
      'effect', 'color', 'brightness', 'contrast', 'saturation', 'hue',
      'keep', 'remove', 'segment', 'cut', 'keep segment', 'remove segment', 'extract segment',
      'keeper', 'goalkeeper', 'keep only', 'remove except', 'save segment', 'section',
      'clip', 'part', 'portion', 'scene', 'include only', 'exclude', 'include', 'cut out',
      'madmax', 'mad max',
      'add audio', 'add music', 'add sound', 'merge audio', 'add soundtrack', 'overlay audio',
      'combine audio', 'combine with audio', 'attach audio', 'include audio'
    ]; 
  
    // Exclusion list - commands that should NOT get a video path even if they match video commands
    const pathExclusionCommands = [
      'list filter', 'list filters', 'list filter templates', 'show filters',
      'available filters', 'what filters', 'list available filters',
      'list effects', 'show effects', 'available effects', 'help'
    ]; 
    
    // Placeholder for the processed message that might include the video path
    let processedMessage = message;
    let includesVideoPath = false;
    let audioFile = null;
    
    // Check if the message already includes a file path
    const hasFilePath = /[A-Za-z]:\\|[A-Za-z]:/.test(message);
    
    // Check if the message mentions an audio file
    const lowerMessage = message.toLowerCase();
    const audioCommands = ['add audio', 'add music', 'add sound', 'merge audio', 'add soundtrack', 'overlay audio'];
    const isAudioCommand = audioCommands.some(cmd => lowerMessage.includes(cmd));
    
    // If this is an audio-related command, look for audio file references
    if (isAudioCommand) {
      // Extract potential audio file names using regex
      // Look for patterns like "add music.mp3 to the video" or "add the file sound.mp3"
      const audioFileMatches = lowerMessage.match(/add\s+([\w-]+\.(mp3|wav|ogg|aac|m4a))/) || 
                             lowerMessage.match(/music\s+([\w-]+\.(mp3|wav|ogg|aac|m4a))/) ||
                             lowerMessage.match(/audio\s+([\w-]+\.(mp3|wav|ogg|aac|m4a))/) ||
                             lowerMessage.match(/sound\s+([\w-]+\.(mp3|wav|ogg|aac|m4a))/) ||
                             // Also look for just the file name with extension
                             lowerMessage.match(/([\w-]+\.(mp3|wav|ogg|aac|m4a))/); 
      
      if (audioFileMatches && audioFileMatches[1]) {
        const audioFileName = audioFileMatches[1];
        console.log(`Detected audio file mention: ${audioFileName}`);
        
        // Look for this audio file in our uploaded media
        audioFile = findAudioFile(audioFileName);
        
        if (audioFile) {
          console.log(`Found matching audio file: ${audioFile.name}`);
          // Don't show notification that we're using this audio file
          // Notification removed as per user request
        }
      }
    }
    
    // If we have a video displayed in the preview and the message includes a video command
    // Always use the current video in the preview, which might be different from the originally selected video
    if (selectedVideo) {
      // We already defined lowerMessage above, so we'll reuse it here
      const isVideoCommand = videoCommands.some(cmd => lowerMessage.includes(cmd));
      
      // Check if this is a command that should be excluded from getting a video path
      const shouldExclude = pathExclusionCommands.some(cmd => lowerMessage.includes(cmd));
      
      if (isVideoCommand && !shouldExclude) {
        // Whether or not we already have a file path, we'll ensure we use the local file path
        // from the server rather than the API URL path
        includesVideoPath = true;
        
        // Instead of adding the path to the message, we'll pass it separately to the backend
        // in the videoContext object, and let the backend handle converting the path
        console.log(`Using currently loaded video for this command: ${selectedVideo.name}`);
        
        // Don't show notification when using the current video
        // This line was removed as per user request
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
      
      // Send the processed message (with video and audio context if applicable)
      // Always use the currently displayed video, which may be different from the originally selected video
      // This ensures that each command in a sequence operates on the most recent output
      const response = await axios.post('/api/chat', { 
        message: processedMessage,
        videoContext: includesVideoPath ? selectedVideo : null,  // selectedVideo will be the most recent one in the preview
        audioContext: audioFile  // Include the audio file if found
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
        
        // Check if this was an audio merge or format conversion operation based on the user's original message
        const userQuery = response.data.user && response.data.user.content ? response.data.user.content.toLowerCase() : '';
        const isAudioMergeOperation = userQuery.includes('add audio') || 
                                    userQuery.includes('merge audio') || 
                                    userQuery.includes('add music') || 
                                    userQuery.includes('add sound');
        
        // Check if this was a format conversion like Instagram format
        const isFormatConversion = userQuery.includes('instagram') ||  
                                 userQuery.includes('aspect ratio') || 
                                 userQuery.includes('convert format') || 
                                 userQuery.includes('square format');
        
        // Specifically detect requested format type
        const isInstagramStoryFormat = userQuery.includes('instagram story') || 
                                      userQuery.includes('9:16') || 
                                      userQuery.includes('vertical') || 
                                      userQuery.includes('portrait') || 
                                      userQuery.includes('instagram reel');
        
        const isInstagramSquareFormat = userQuery.includes('instagram square') || 
                                       userQuery.includes('1:1') || 
                                       userQuery.includes('square');
        
        // Function to find and load the most recent processed video
        const findAndLoadRecentVideo = async (searchPatterns) => {
          try {
            await loadServerMedia();
            const mediaList = await getAllMedia();
            
            if (mediaList && mediaList.videos) {
              // Sort by most recent first
              const sortedVideos = [...mediaList.videos].sort((a, b) => b.lastModified - a.lastModified);
              
              // Look for videos with any of the search patterns
              const recentVideo = sortedVideos.find(v => {
                // Check if the video name matches any of the patterns
                return searchPatterns.some(pattern => v.name.includes(pattern)) || 
                      (v.lastModified && Date.now() - v.lastModified < 10000); // Created in the last 10 seconds
              });
              
              if (recentVideo) {
                console.log(`Found recent processed video: ${recentVideo.name}`);
                recentVideo.isDropped = true;
                onVideoSelect(recentVideo);
                return true;
              }
            }
            return false;
          } catch (err) {
            console.error('Error looking for processed output:', err);
            return false;
          }
        };

        // If this was an audio merge operation, refresh media list and look for output files
        if (isAudioMergeOperation) {
          console.log('Detected audio merge operation, refreshing media list to find new output file');
          setTimeout(() => {
            findAndLoadRecentVideo(['_with_audio', '-with-audio', '_audio']);
          }, 1000);
        }
        
        // If this was a format conversion operation, refresh media list and look for output files
        if (isFormatConversion) {
          console.log('Detected format conversion operation, refreshing media list to find new output file');
          setTimeout(() => {
            findAndLoadRecentVideo(['_instagram', '_1x1', 'instagram', 'square']);
          }, 1000);
        }
        
        if (assistantContent) {
          try {
            // Look for output file paths in the response - enhance pattern matching for more cases
            const outputPathMatch = assistantContent.match(/output(?:Path|File)\s*:\s*"?([^"\s,\n]+)"?/i) ||
                                  assistantContent.match(/saved(?:\s+(?:as|to))?\s*:?\s*"?([^"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))"?/i) ||
                                  assistantContent.match(/successfully\s+(?:created|generated|processed|trimmed|converted|saved|merged)\s+(?:as\s+|into\s+)?`?"?([^`"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))`?"?/i) ||
                                  assistantContent.match(/(?:trimmed|processed|exported|created|merged).*?(?:saved\s+as|as|into)\s+`?"?([^`"\s,\n]+\.(?:mp4|mov|avi|webm|mkv))`?"?/i) ||
                                  assistantContent.match(/output is in\s+`([^`]+)`/i) ||
                                  assistantContent.match(/merged.*?output is in\s+`([^`]+)`/i) ||
                                  assistantContent.match(/have been successfully merged.*?`([^`]+)`/i) ||
                                  assistantContent.match(/merged into `([^`]+)`/i) ||
                                  assistantContent.match(/into `([^`]+)`/i) ||
                                  assistantContent.match(/output is saved at\s+`([^`]+)`/i) ||
                                  assistantContent.match(/saved at\s+`([^`]+)`/i) ||
                                  assistantContent.match(/The output is in\s+`([^`]+)`/i) ||
                                  assistantContent.match(/converted.*?saved at\s+`([^`]+)`/i) ||
                                  assistantContent.match(/instagram.*?saved at\s+`([^`]+)`/i) ||
                                  assistantContent.match(/merged with the video.*?output is in\s+`([^`]+)`/i) ||
                                  (assistantContent.match(/output\.mp4/i) ? ['output.mp4', 'output.mp4'] : null) ||
                                  assistantContent.match(/([^\s,\n]+_with_audio\.(?:mp4|mov|avi|webm|mkv))/i) ||
                                  assistantContent.match(/"([^"\s,\n]+_trimmed\.(?:mp4|mov|avi|webm|mkv))"/i) ||
                                  assistantContent.match(/([^\s,\n]+_instagram\.(?:mp4|mov|avi|webm|mkv))/i);
            
            if (outputPathMatch && outputPathMatch[1]) {
              const outputPath = outputPathMatch[1];
              console.log(`Detected output video path: ${outputPath}`);
              
              // Get just the filename regardless of path format
              let fileName = outputPath;
              // If it has path separators, extract just the filename
              if (outputPath.includes('\\') || outputPath.includes('/')) {
                fileName = outputPath.split(/[\\/]/).pop(); // Get the filename
              }
              console.log(`Looking for processed video with filename: ${fileName}`);
              
              // Check if this is an API path like /api/videos/123456-output.mp4
              if (outputPath.startsWith('/api/videos/')) {
                console.log(`Detected API path, loading directly: ${outputPath}`);
                
                // Request the video information from the server
                setTimeout(async () => {
                  try {
                    // Refresh media list first
                    await loadServerMedia();
                    
                    // Then look for the video with this path
                    const mediaList = await getAllMedia();
                    const video = mediaList.videos.find(v => v.path === outputPath);
                    
                    if (video) {
                      console.log(`Found video with path: ${outputPath}`);
                      video.isDropped = true;
                      onVideoSelect(video);
                    } else {
                      console.log(`Could not find video with path: ${outputPath}, falling back to filename`);
                      loadVideoByFilename(fileName);
                    }
                  } catch (error) {
                    console.error(`Error loading video by API path: ${error}`);
                    loadVideoByFilename(fileName);
                  }
                }, 1000); // Wait a second for the server to finish processing
              } else {
                try {
                  // Use our dedicated video loading function with better retry logic
                  loadVideoByFilename(fileName);
                  
                  // Also check for patterns like _trimmed suffix if the filename contains them
                  if (fileName.includes('_trimmed')) {
                    const baseName = fileName.split('_trimmed')[0];
                    console.log(`Also looking for video with base name: ${baseName} plus _trimmed suffix`);
                    setTimeout(() => {
                      loadVideoByFilename(baseName + '_trimmed');
                    }, 500);
                  }
                  
                  // Special case for timestamp-prefixed filenames
                  if (fileName.match(/^\d+\-/)) {
                    const baseNameWithoutTimestamp = fileName.split('-').slice(1).join('-');
                    console.log(`Also looking for video with name: ${baseNameWithoutTimestamp}`);
                    setTimeout(() => {
                      loadVideoByFilename(baseNameWithoutTimestamp);
                    }, 1000);
                  }
                  
                  // Also check for Instagram formats
                  if (fileName.includes('_instagram')) {
                    const baseName = fileName.split('_instagram')[0];
                    console.log(`Also looking for Instagram-formatted video with base name: ${baseName}`);
                    setTimeout(() => {
                      loadVideoByFilename(baseName + '_instagram');
                    }, 800);
                  }
                } catch (error) {
                  console.error(`Error loading video by filename: ${error}`);
                }
              }
            }
          } catch (error) {
            console.error('Error processing video path from response:', error);
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
