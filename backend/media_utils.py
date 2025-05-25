import os
import shutil
import time
from werkzeug.utils import secure_filename

# Media storage directories
UPLOADS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
TEMP_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
VIDEOS_FOLDER = os.path.join(UPLOADS_FOLDER, 'videos')
PHOTOS_FOLDER = os.path.join(UPLOADS_FOLDER, 'photos')
AUDIO_FOLDER = os.path.join(UPLOADS_FOLDER, 'audio')
THUMBNAILS_FOLDER = os.path.join(UPLOADS_FOLDER, 'thumbnails')

# Create necessary directories if they don't exist
for folder in [UPLOADS_FOLDER, TEMP_FOLDER, VIDEOS_FOLDER, PHOTOS_FOLDER, AUDIO_FOLDER, THUMBNAILS_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Created directory: {folder}")

# File type extensions
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']

# Import subprocess for running ffmpeg
import subprocess

def get_media_type(filename):
    """Determine media type based on file extension"""
    ext = os.path.splitext(filename.lower())[1]
    
    if ext in VIDEO_EXTENSIONS:
        return 'videos'
    elif ext in PHOTO_EXTENSIONS:
        return 'photos'
    elif ext in AUDIO_EXTENSIONS:
        return 'audio'
    else:
        # Default to video if unknown
        return 'videos'

def generate_thumbnail(video_path, timestamp=2):
    """Generate a thumbnail for a video file using ffmpeg
    
    Args:
        video_path (str): Path to the video file
        timestamp (int): Timestamp in seconds to capture for the thumbnail
        
    Returns:
        str: Path to the generated thumbnail, or None if generation failed
    """
    try:
        # Extract filename without extension
        video_filename = os.path.basename(video_path)
        base_name = os.path.splitext(video_filename)[0]
        
        # Create thumbnail filename
        thumbnail_filename = f"{base_name}-thumbnail.jpg"
        thumbnail_path = os.path.join(THUMBNAILS_FOLDER, thumbnail_filename)
        
        # Ensure thumbnails directory exists
        os.makedirs(THUMBNAILS_FOLDER, exist_ok=True)
        
        # Use ffmpeg to generate the thumbnail
        # -y: Overwrite output file if it exists
        # -ss: Seek to timestamp
        # -i: Input file
        # -vframes 1: Extract one frame
        # -q:v 2: Quality (lower is better, 2-31 range)
        # -f image2: Force image2 format
        cmd = [
            'ffmpeg', '-y', '-ss', str(timestamp), 
            '-i', video_path, '-vframes', '1', 
            '-q:v', '2', '-f', 'image2', thumbnail_path
        ]
        
        # Run the command with a timeout
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(timeout=30)
        
        # Check if thumbnail was created successfully
        if os.path.exists(thumbnail_path) and os.path.getsize(thumbnail_path) > 0:
            return f"/api/thumbnails/{thumbnail_filename}"
        else:
            print(f"Error creating thumbnail: {stderr.decode() if stderr else 'Unknown error'}")
            return None
    except Exception as e:
        print(f"Error generating thumbnail: {str(e)}")
        return None

def get_file_path_from_url(url):
    """Convert an API URL to a file system path"""
    if not url or not isinstance(url, str):
        return url
        
    # Handle video paths
    if '/api/videos/' in url:
        filename = url.split('/api/videos/')[-1]
        return os.path.join(VIDEOS_FOLDER, filename)
        
    # Handle photo paths
    if '/api/photos/' in url:
        filename = url.split('/api/photos/')[-1]
        return os.path.join(PHOTOS_FOLDER, filename)
        
    # Handle audio paths
    if '/api/audio/' in url:
        filename = url.split('/api/audio/')[-1]
        return os.path.join(AUDIO_FOLDER, filename)
        
    # Handle temp paths
    if '/api/temp/' in url:
        filename = url.split('/api/temp/')[-1]
        return os.path.join(TEMP_FOLDER, filename)
        
    # Handle thumbnail paths
    if '/api/thumbnails/' in url:
        filename = url.split('/api/thumbnails/')[-1]
        return os.path.join(THUMBNAILS_FOLDER, filename)
        
    return url

def save_media_file(file, is_temp=False):
    """Save a media file to the appropriate directory"""
    filename = secure_filename(file.filename)
    media_type = get_media_type(filename)
    
    # Add timestamp to ensure unique filename
    timestamp = int(time.time() * 1000)
    unique_filename = f"{timestamp}-{filename}"
    
    try:
        print(f"Attempting to save file: {filename}")
        
        if is_temp:
            # Save to temp directory
            file_path = os.path.join(TEMP_FOLDER, unique_filename)
            print(f"Saving temp file to: {file_path}")
            file.save(file_path)
            media_url = f"/api/temp/{unique_filename}"
        else:
            # Save to appropriate media directory
            if media_type == 'videos':
                dest_folder = VIDEOS_FOLDER
            elif media_type == 'photos':
                dest_folder = PHOTOS_FOLDER
            else:  # audio
                dest_folder = AUDIO_FOLDER
                
            file_path = os.path.join(dest_folder, unique_filename)
            print(f"Saving {media_type} file to: {file_path}")
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Save the file
            file.save(file_path)
            media_url = f"/api/{media_type}/{unique_filename}"
            
            print(f"File saved successfully: {file_path}")
        
        # Verify file exists
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print(f"File saved with size: {file_size} bytes")
        else:
            print(f"WARNING: File does not exist after save: {file_path}")
            file_size = 0
        
        # Result object to return
        result = {
            'id': str(timestamp),
            'name': filename,
            'path': media_url,
            'type': media_type,
            'size': file_size,
            'lastModified': timestamp,
            'isTemp': is_temp
        }
        
        # Generate thumbnail for videos
        if media_type == 'videos' and not is_temp:
            print(f"Generating thumbnail for video: {file_path}")
            thumbnail_path = generate_thumbnail(file_path)
            if thumbnail_path:
                result['thumbnailPath'] = thumbnail_path
                print(f"Thumbnail generated: {thumbnail_path}")
            else:
                print("Failed to generate thumbnail")
                
        return result
    except Exception as e:
        print(f"ERROR saving file {filename}: {str(e)}")
        # Re-raise the exception for handling in the route
        raise

def delete_temp_file(filename):
    """Delete a temporary media file"""
    file_path = os.path.join(TEMP_FOLDER, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False

def clean_temp_files():
    """Remove all temporary files"""
    count = 0
    if os.path.exists(TEMP_FOLDER):
        for filename in os.listdir(TEMP_FOLDER):
            file_path = os.path.join(TEMP_FOLDER, filename)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    count += 1
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")
    return count

def get_all_media():
    """Get all media files organized by type"""
    result = {
        'videos': [],
        'photos': [],
        'audio': []
    }
    
    # Helper to read from a specific directory
    def read_media_dir(directory, media_type):
        media_list = []
        if not os.path.exists(directory):
            return media_list
            
        for filename in os.listdir(directory):
            if os.path.isfile(os.path.join(directory, filename)):
                try:
                    # Get timestamp from filename
                    timestamp = int(filename.split('-')[0])
                    original_name = filename[len(str(timestamp))+1:]
                    
                    file_path = os.path.join(directory, filename)
                    stats = os.stat(file_path)
                    
                    # Create base media item
                    media_item = {
                        'id': str(timestamp),
                        'name': original_name,
                        'path': f"/api/{media_type}/{filename}",
                        'type': media_type,
                        'size': stats.st_size,
                        'lastModified': timestamp
                    }
                    
                    # Add thumbnail for videos
                    if media_type == 'videos':
                        # Check if thumbnail exists
                        base_name = os.path.splitext(filename)[0]
                        thumbnail_filename = f"{base_name}-thumbnail.jpg"
                        thumbnail_path = os.path.join(THUMBNAILS_FOLDER, thumbnail_filename)
                        
                        if os.path.exists(thumbnail_path):
                            media_item['thumbnailPath'] = f"/api/thumbnails/{thumbnail_filename}"
                        else:
                            # Generate thumbnail if it doesn't exist
                            thumbnail_url = generate_thumbnail(file_path)
                            if thumbnail_url:
                                media_item['thumbnailPath'] = thumbnail_url
                    
                    media_list.append(media_item)
                except Exception as e:
                    print(f"Error processing {filename}: {e}")
        
        # Sort by timestamp (newest first)
        media_list.sort(key=lambda x: x['lastModified'], reverse=True)
        return media_list
    
    # Read all media directories
    result['videos'] = read_media_dir(VIDEOS_FOLDER, 'videos')
    result['photos'] = read_media_dir(PHOTOS_FOLDER, 'photos')
    result['audio'] = read_media_dir(AUDIO_FOLDER, 'audio')
    
    return result
