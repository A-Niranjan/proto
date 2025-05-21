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

# Create necessary directories if they don't exist
for folder in [UPLOADS_FOLDER, TEMP_FOLDER, VIDEOS_FOLDER, PHOTOS_FOLDER, AUDIO_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Created directory: {folder}")

# File type extensions
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']

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
        
        return {
            'id': str(timestamp),
            'name': filename,
            'path': media_url,
            'type': media_type,
            'size': file_size,
            'lastModified': timestamp,
            'isTemp': is_temp
        }
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
                    
                    media_list.append({
                        'id': str(timestamp),
                        'name': original_name,
                        'path': f"/api/{media_type}/{filename}",
                        'type': media_type,
                        'size': stats.st_size,
                        'lastModified': timestamp
                    })
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
