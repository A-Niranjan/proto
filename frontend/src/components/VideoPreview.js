import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  useMediaQuery, 
  useTheme, 
  Slider,
  Fade
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';

const VideoPreview = ({ video }) => {
  // Only show video if it was explicitly dragged and dropped (has isDropped flag)
  const shouldShowVideo = video && video.isDropped;
  // State for video player - simplified for a cleaner interface
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [idleTimer, setIdleTimer] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeSliderRef = useRef(null);
  
  // Media query hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Format time for display
  const formatTime = (time) => {
    if (isNaN(time) || time === null) return "00:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Auto-hide controls after inactivity
  useEffect(() => {
    const showControls = () => {
      setIsControlsVisible(true);
      
      // Clear any existing timer
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      
      // Set a new timer
      const timer = setTimeout(() => {
        if (isPlaying) {
          setIsControlsVisible(false);
        }
      }, 3000);
      
      setIdleTimer(timer);
    };

    // Add event listeners
    const videoContainer = videoContainerRef.current;
    if (videoContainer) {
      videoContainer.addEventListener('mousemove', showControls);
      videoContainer.addEventListener('click', showControls);
      videoContainer.addEventListener('touchstart', showControls, { passive: true });
    }
    
    // Initial show
    showControls();
    
    // Cleanup
    return () => {
      if (videoContainer) {
        videoContainer.removeEventListener('mousemove', showControls);
        videoContainer.removeEventListener('click', showControls);
        videoContainer.removeEventListener('touchstart', showControls);
      }
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [idleTimer, isPlaying]);
  
  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
    setIsControlsVisible(true);
  };
  
  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (event, newValue) => {
    const volumeValue = newValue / 100;
    setVolume(volumeValue);
    
    if (videoRef.current) {
      videoRef.current.volume = volumeValue;
    }
    
    if (volumeValue === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    videoRef.current.muted = newMuteState;
  };
  
  // Handle video progress click/touch
  const handleProgressClick = (e) => {
    if (!videoRef.current || !progressRef.current) return;
    
    try {
      // Get the dimensions of the progress bar
      const rect = progressRef.current.getBoundingClientRect();
      // Calculate the click position relative to the progress bar width
      const pos = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
      // Get the total duration from the video element directly
      const videoDuration = videoRef.current.duration || 0;
      // Calculate the time to seek to
      const seekTime = pos * videoDuration;
      
      // Update the video's current time
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      
      // Keep controls visible
      setIsControlsVisible(true);
      
      console.log(`Seeking to ${seekTime}s / ${videoDuration}s`);
    } catch (error) {
      console.error('Error seeking video:', error);
    }
  };
  
  // Skip forward/backward
  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    
    try {
      const currentTime = videoRef.current.currentTime;
      const maxDuration = videoRef.current.duration || 0;
      const newTime = Math.min(Math.max(currentTime + seconds, 0), maxDuration);
      
      // Update the video's current time
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setIsControlsVisible(true);
      
      console.log(`Skipped from ${currentTime} to ${newTime}`);
    } catch (error) {
      console.error('Error skipping time:', error);
    }
  };

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!videoRef.current) return;
      
      switch (e.key) {
        case 'ArrowLeft': // Left Arrow
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight': // Right Arrow
          e.preventDefault();
          skipTime(10);
          break;
        case 'f': // f
        case 'F': // F
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm': // m
        case 'M': // M
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration]);
  
  // Video playback state effects
  useEffect(() => {
    // Reset state when video changes
    if (video?.path) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [video]);

  // Update current time when video is playing
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    // Define event handlers
    const handleTimeUpdate = () => {
      const currentTime = videoElement.currentTime;
      setCurrentTime(currentTime);
    };
    
    const handleDurationChange = () => {
      const videoDuration = videoElement.duration;
      console.log('Duration changed:', videoDuration);
      if (!isNaN(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
      }
    };
    
    const handleLoadedMetadata = () => {
      const videoDuration = videoElement.duration;
      console.log('Metadata loaded, duration:', videoDuration);
      if (!isNaN(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
      }
      // Set initial volume
      videoElement.volume = volume;
      videoElement.muted = isMuted;
    };
    
    const handleLoadedData = () => {
      const videoDuration = videoElement.duration;
      console.log('Data loaded, duration:', videoDuration);
      if (!isNaN(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
      }
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(videoElement.duration || 0);
    };

    const handleError = (e) => {
      console.error('Video error:', e);
    };
    
    // Add event listeners
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('error', handleError);
    
    // Clean up event listeners
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('error', handleError);
    };
  }, [isMuted, volume, video]);

  return (
    <Box 
      ref={videoContainerRef}
      className="video-preview-container" 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '16px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
      }}
    >
      {!video ? (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <Box sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
          }}>
            <PlayArrowIcon sx={{ fontSize: 50, color: 'rgba(255,255,255,0.2)' }} />
          </Box>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
            No Video Selected
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Select a video from the library to preview and edit.
          </Typography>
        </Box>
      ) : (
        <Box 
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            borderRadius: '12px',
            backgroundColor: '#000'
          }}
        >
          {/* Video Player - only show when media is explicitly dragged */}
          {shouldShowVideo && video?.path ? (
            <video
              ref={videoRef}
              src={video.path}
              style={{
                width: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              controls={false}
              autoPlay={false}
              playsInline
              preload="metadata"
              onClick={togglePlay}
            />
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              flexDirection: 'column',
              color: 'text.secondary'
            }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Drag media here to preview
              </Typography>
              <Typography variant="body2">
                Select and drag items from the media panel to start previewing
              </Typography>
            </Box>
          )}
          
          {/* Video Controls Overlay */}
          <Fade in={isControlsVisible}>
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Progress Bar */}
              <Box 
                ref={progressRef}
                onClick={handleProgressClick}
                onMouseDown={handleProgressClick}
                sx={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': {
                    height: '6px'
                  },
                  transition: 'height 0.2s ease'
                }}
              >
                <Box 
                  role="progressbar" 
                  aria-valuenow={(currentTime / duration) * 100 || 0} 
                  aria-valuemin="0" 
                  aria-valuemax="100" 
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.min(((currentTime || 0) / (duration || 1)) * 100, 100)}%`,
                    backgroundColor: '#9c27b0',
                    borderRadius: '2px'
                  }} 
                />
              </Box>
              
              {/* Controls Row */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                {/* Left Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    onClick={togglePlay}
                    sx={{ color: 'white' }}
                    size={isSmallMobile ? 'small' : 'medium'}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  
                  <IconButton
                    onClick={() => skipTime(-10)}
                    sx={{ color: 'white' }}
                    size={isSmallMobile ? 'small' : 'medium'}
                  >
                    <Replay10Icon />
                  </IconButton>
                  
                  <IconButton
                    onClick={() => skipTime(10)}
                    sx={{ color: 'white' }}
                    size={isSmallMobile ? 'small' : 'medium'}
                  >
                    <Forward10Icon />
                  </IconButton>
                  
                  {!isSmallMobile && (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        position: 'relative'
                      }}
                      onMouseEnter={() => setIsVolumeSliderOpen(true)}
                      onMouseLeave={() => setIsVolumeSliderOpen(false)}
                    >
                      <IconButton 
                        onClick={toggleMute}
                        sx={{ color: 'white' }}
                        size="medium"
                      >
                        {isMuted ? <VolumeOffIcon /> : 
                         volume < 0.3 ? <VolumeDownIcon /> : <VolumeUpIcon />}
                      </IconButton>
                      
                      <Fade in={isVolumeSliderOpen}>
                        <Box sx={{ 
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '36px',
                          height: '100px',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          borderRadius: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px 0',
                          marginBottom: '8px'
                        }}>
                          <Slider
                            orientation="vertical"
                            value={isMuted ? 0 : volume * 100}
                            onChange={handleVolumeChange}
                            min={0}
                            max={100}
                            size="small"
                            sx={{ 
                              color: '#9c27b0',
                              height: '80px',
                              '& .MuiSlider-thumb': {
                                width: 12,
                                height: 12,
                                backgroundColor: '#fff'
                              }
                            }}
                          />
                        </Box>
                      </Fade>
                    </Box>
                  )}
                </Box>
                
                {/* Center Time Display */}
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {formatTime(currentTime || 0)} / {formatTime(duration || 0)}
                </Typography>
                
                {/* Right Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    onClick={toggleFullscreen}
                    sx={{ color: 'white' }}
                    size={isSmallMobile ? 'small' : 'medium'}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Fade>
          
          {/* Large Play Button Overlay when paused */}
          {!isPlaying && (
            <Fade in={true}>
              <Box 
                onClick={togglePlay}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isSmallMobile ? '60px' : '80px',
                  height: isSmallMobile ? '60px' : '80px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(156, 39, 176, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(156, 39, 176, 0.9)',
                    transform: 'translate(-50%, -50%) scale(1.05)'
                  }
                }}
              >
                <PlayArrowIcon sx={{ fontSize: isSmallMobile ? 36 : 48, color: '#fff' }} />
              </Box>
            </Fade>
          )}
        </Box>
      )}
    </Box>
  );
};

export default VideoPreview;