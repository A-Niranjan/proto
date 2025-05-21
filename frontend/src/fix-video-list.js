import React, { useState, useEffect, useRef } from 'react';
import { 
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Fade,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material';

// Icons
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoIcon from '@mui/icons-material/Photo';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// This is a code snippet to review and implement in VideoList.js
// It fixes the issues with:
// 1. Buttons overflow outside the container
// 2. Search component styling
// 3. Media card display

// In the VideoList component:

// Fix for the upload area and media type buttons
const UploadArea = ({ activeTab, onTabChange, fileInputRef, handleFileInputChange, getAcceptAttribute }) => {
  return (
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
  );
};

// Fix for the search component
const SearchToolbar = ({ filterValue, handleSearchChange, viewMode, setViewMode }) => {
  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(30, 30, 36, 0.8)', mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        width: '100%',
        position: 'relative'
      }}>
        {/* Search bar - redesigned */}
        <TextField
          placeholder="Search media..."
          size="small"
          value={filterValue}
          onChange={handleSearchChange}
          fullWidth
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}/>
              </InputAdornment>
            ),
            endAdornment: filterValue ? (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => handleSearchChange({ target: { value: '' } })}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
        
        {/* View toggle - absolute positioned to right side */}
        <Box sx={{ 
          position: 'absolute', 
          right: 8,
          display: 'flex',
          alignItems: 'center'
        }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 2,
              border: 'none',
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                p: '4px 6px',
                borderRadius: '4px !important',
                color: 'rgba(255, 255, 255, 0.6)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(156, 39, 176, 0.7)',
                  color: 'white'
                }
              }
            }}
          >
            <ToggleButton value="grid" aria-label="grid view">
              <GridViewIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Paper>
  );
};

// Fix for the media card display
const MediaCard = ({ video, handleVideoHover, handleVideoHoverEnd, onSelectVideo, formatFileSize, formatDuration, hoverVideo }) => {
  return (
    <Card
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.2s',
        height: '100%',
        width: '100%',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 20px -10px rgba(0,0,0,0.3)'
        },
        backgroundColor: 'rgba(18, 18, 22, 0.9)'
      }}
      onMouseEnter={() => handleVideoHover(video.id || video.name)}
      onMouseLeave={handleVideoHoverEnd}
      onClick={() => onSelectVideo(video)}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(video));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <Box sx={{ position: 'relative', pt: '56.25%' }}>
        {(video.type === 'photos' || video.path?.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
          <CardMedia
            component="img"
            image={video.path || '/placeholder-image.jpg'}
            alt={video.name}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 1
            }}
          />
        ) : (video.type === 'videos' || video.path?.match(/\.(mp4|webm|mov)$/i)) ? (
          <>
            <CardMedia
              component="img"
              image={video.thumbnail || '/placeholder-video.jpg'}
              alt={video.name}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 1
              }}
            />
            {/* Video indicator overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                borderRadius: '50%',
                bgcolor: 'rgba(156, 39, 176, 0.8)',
                color: 'white',
                p: 0.5,
                m: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                zIndex: 2
              }}
            >
              <PlayArrowIcon fontSize="small" />
            </Box>
          </>
        ) : (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.2)'
          }}>
            <AudiotrackIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
        )}
        
        <CardContent sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          p: 1.5,
          pb: '10px !important'
        }}>
          <Typography variant="body2" noWrap fontWeight={500} sx={{ mb: 0.5 }}>{video.name}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
              {formatFileSize(video.size || 0)}
            </Typography>
            {video.type === 'videos' && (
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', fontSize: '0.7rem' }}>
                <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
                {formatDuration(video.duration || 0)}
              </Typography>
            )}
          </Box>
        </CardContent>
        
        {/* Hover overlay with play button */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hoverVideo === video.id || hoverVideo === video.name ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <IconButton 
            sx={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(156, 39, 176, 0.8)'
              }
            }}
          >
            <PlayArrowIcon />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

// This is just a helper file to demonstrate the correct implementation
// Copy the relevant parts to fix the VideoList.js file
