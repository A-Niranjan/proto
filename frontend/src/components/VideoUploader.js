import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper, Typography, Button, Box, LinearProgress, Chip, Fade } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const VideoUploader = ({ onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      setUploading(true);
      
      // Simulate upload process
      setTimeout(() => {
        onUpload(file);
        setUploading(false);
        setUploadSuccess(true);
        
        // Reset success state after a delay
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      }, 1500);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    disabled: uploading
  });

  // Get the style based on the dropzone state
  const getStyle = () => {
    if (isDragAccept) {
      return {
        borderColor: '#00c853',
        backgroundColor: 'rgba(0, 200, 83, 0.05)'
      };
    }
    if (isDragReject) {
      return {
        borderColor: '#ff1744',
        backgroundColor: 'rgba(255, 23, 68, 0.05)'
      };
    }
    if (isDragActive) {
      return {
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.05)'
      };
    }
    return {};
  };

  return (
    <Paper 
      elevation={0} 
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: '2px dashed rgba(0, 0, 0, 0.12)',
        background: uploadSuccess ? 'rgba(0, 200, 83, 0.05)' : 'transparent',
        p: 3,
        transition: 'all 0.3s ease',
        ...getStyle(),
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.300',
        backgroundColor: isDragActive ? 'rgba(63, 81, 181, 0.05)' : 'background.paper',
        borderRadius: 2,
        textAlign: 'center',
        transition: 'all 0.2s ease-in-out',
        cursor: uploading ? 'default' : 'pointer'
      }}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      
      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <LinearProgress color="primary" sx={{ height: 4, borderRadius: '4px 4px 0 0' }} />
        </Box>
      )}

      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {uploadSuccess ? (
          <CheckCircleIcon sx={{ fontSize: 54, color: 'success.main', mb: 2 }} />
        ) : uploading ? (
          <VideoFileIcon sx={{ fontSize: 54, color: 'primary.light', mb: 2, opacity: 0.8 }} />
        ) : (
          <CloudUploadIcon sx={{ fontSize: 54, color: 'primary.main', mb: 2 }} />
        )}

        {fileName && (
          <Fade in={!!fileName}>
            <Chip 
              icon={<VideoFileIcon />} 
              label={fileName} 
              color={uploadSuccess ? 'success' : 'primary'} 
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Fade>
        )}
        
        {isDragActive ? (
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Drop the video here...
          </Typography>
        ) : uploading ? (
          <Typography variant="body1">
            Uploading video...
          </Typography>
        ) : uploadSuccess ? (
          <Typography variant="body1" color="success.main" sx={{ fontWeight: 500 }}>
            Upload successful!
          </Typography>
        ) : (
          <>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
              Drag & drop a video file here, or click to select
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: MP4, MOV, AVI, WEBM
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 3, px: 3, py: 1 }}
              startIcon={<CloudUploadIcon />}
            >
              Select Video
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default VideoUploader;