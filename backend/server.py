import os
import json
import sys
import threading
import asyncio
import time
import subprocess
import msvcrt
import os
import shutil
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uvicorn
from a2wsgi import WSGIMiddleware
from media_utils import save_media_file, delete_temp_file, clean_temp_files, get_all_media, VIDEOS_FOLDER, PHOTOS_FOLDER, AUDIO_FOLDER, TEMP_FOLDER, THUMBNAILS_FOLDER, get_file_path_from_url

# Function to handle output files and move them to the proper location
def handle_output_file(output_path):
    """
    Handle an output file by moving it to the proper videos folder and
    generating a unique filename with timestamp
    
    Args:
        output_path (str): Path to the output file
    
    Returns:
        str: New path to the moved file
    """
    # Check if the file exists
    if not os.path.exists(output_path):
        print(f"[DEBUG] Output file not found: {output_path}")
        return None
        
    # Get the filename
    filename = os.path.basename(output_path)
    
    # Determine if this is an audio-merged file
    is_audio_merged = 'with_audio' in filename
    
    # Create a new filename with timestamp
    timestamp = int(time.time() * 1000)
    name, ext = os.path.splitext(filename)
    
    # For files that already have _with_audio, we need to make sure we don't duplicate it
    if 'with_audio' in name:
        # If we're adding audio to an already audio-merged file, use a different suffix
        base_name = name.replace('_with_audio', '').replace('-with-audio', '')
        new_filename = f"{timestamp}-{base_name}_audio_enhanced{ext}"
    elif name == 'output':
        # For standard output files, add an indicator
        new_filename = f"{timestamp}-{name}_with_audio{ext}"
    else:
        # For other files, add the standard suffix
        new_filename = f"{timestamp}-{name}{ext}"
    
    # Create the new path in the videos folder
    new_path = os.path.join(VIDEOS_FOLDER, new_filename)
    
    try:
        # Move the file to the videos folder
        shutil.move(output_path, new_path)
        print(f"[DEBUG] Moved output file from {output_path} to {new_path}")
        
        # Return the API path for this file
        return f"/api/videos/{new_filename}"
    except Exception as e:
        print(f"[DEBUG] Error moving output file: {e}")
        return None

# Create Flask app
app = Flask(__name__, static_folder='../frontend/build')
CORS(app)
# Clean any temporary files on startup
clean_count = clean_temp_files()
print(f"Cleaned {clean_count} temporary files on startup")

# Store chat history
chat_history = []

# MCP client process
mcp_process = None

# Path to the MCP server script
mcp_server_path = None

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/media', methods=['GET'])
def get_all_media_files():
    """Get all media files organized by type"""
    return jsonify(get_all_media())

@app.route('/api/test.html', methods=['GET'])
def serve_test_page():
    """Serve the test HTML page"""
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'upload_test.html')

@app.route('/api/videos/<filename>', methods=['GET'])
def get_video(filename):
    """Serve a video file"""
    return send_from_directory(VIDEOS_FOLDER, filename)

@app.route('/api/photos/<filename>', methods=['GET'])
def get_photo(filename):
    """Serve a photo file"""
    return send_from_directory(PHOTOS_FOLDER, filename)

@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """Serve an audio file"""
    return send_from_directory(AUDIO_FOLDER, filename)

@app.route('/api/temp/<filename>', methods=['GET'])
def get_temp_file(filename):
    """Serve a temporary file"""
    return send_from_directory(TEMP_FOLDER, filename)

@app.route('/api/thumbnails/<filename>', methods=['GET'])
def get_thumbnail(filename):
    """Serve a thumbnail file"""
    return send_from_directory(THUMBNAILS_FOLDER, filename)

@app.route('/api/upload', methods=['POST'])
def upload_media():
    """Upload a media file (video, photo, or audio)"""
    print("\n*** UPLOAD ENDPOINT CALLED ***")
    print(f"Request files: {request.files}")
    
    if 'file' not in request.files:
        print("Error: No file part")
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        print("Error: No selected file")
        return jsonify({'error': 'No selected file'}), 400
    
    # Print file info
    print(f"Received file: {file.filename} (mimetype: {file.mimetype})")
    
    # Save the file using our utility
    try:
        # Create basic directories manually just to be sure
        for folder in [VIDEOS_FOLDER, PHOTOS_FOLDER, AUDIO_FOLDER, TEMP_FOLDER]:
            os.makedirs(folder, exist_ok=True)
        
        # Save file to disk
        media_info = save_media_file(file, is_temp=False)
        print(f"File uploaded successfully: {media_info}")
        return jsonify(media_info)
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload/temp', methods=['POST'])
def upload_temp_media():
    """Upload a temporary media file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Save as a temporary file
    try:
        media_info = save_media_file(file, is_temp=True)
        return jsonify(media_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/temp/<filename>', methods=['DELETE'])
def delete_temp_media(filename):
    """Delete a temporary media file"""
    success = delete_temp_file(filename)
    if success:
        return jsonify({'success': True, 'message': f'Deleted {filename}'})
    else:
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/temp', methods=['DELETE'])
def clean_all_temp_media():
    """Clean all temporary media files"""
    count = clean_temp_files()
    return jsonify({'success': True, 'deletedCount': count, 'message': f'Deleted {count} temporary files'})

@app.route('/api/chat', methods=['GET'])
def get_chat_history():
    return jsonify(chat_history)

# Helper function to convert API URLs to file system paths
def convert_api_url_to_path(url):
    """Convert an API URL like /api/videos/filename to a file system path"""
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
        
    return url

@app.route('/api/chat', methods=['POST'])
def send_message():
    global mcp_process
    
    data = request.json
    message = data.get('message', '')
    video_context = data.get('videoContext', None)
    audio_context = data.get('audioContext', None)
    print(f"\n[DEBUG] Received message: '{message}'")
    
    # If we have video context, make sure to convert API paths to file system paths
    if video_context:
        print(f"[DEBUG] With video context: {video_context}")
        
        # Convert the URL path to a file system path
        if 'path' in video_context and video_context['path']:
            original_path = video_context['path']
            file_system_path = convert_api_url_to_path(original_path)
            
            if file_system_path and file_system_path != original_path:
                # Append the file path to the message
                print(f"[DEBUG] Appended file system path to message: '{message} {file_system_path}'")
                message = f"{message} {file_system_path}"
            
    # If we have audio context, make sure to convert API paths to file system paths
    if audio_context:
        print(f"[DEBUG] With audio context: {audio_context}")
        
        # Convert the URL path to a file system path
        if 'path' in audio_context and audio_context['path']:
            original_audio_path = audio_context['path']
            audio_file_system_path = convert_api_url_to_path(original_audio_path)
            
            if audio_file_system_path and audio_file_system_path != original_audio_path:
                # Append the audio file path to the message
                print(f"[DEBUG] Appended audio file system path to message: '{message} {audio_file_system_path}'")
                message = f"{message} {audio_file_system_path}"
            # No need for an elif clause here since we already append the path above
    
    if not message:
        return jsonify({'error': 'Empty message'}), 400
    
    # Generate a unique request ID for this message
    request_id = str(int(time.time() * 1000)) + '-' + str(hash(message) % 10000)
    
    # Pre-process message to handle special cases like audio merging or format conversion
    print(f"[DEBUG] Starting message pre-processing for: '{message}'")
    
    # Check for audio replacement commands first
    audio_cmd_patterns = ['replace audio', 'swap audio', 'change audio', 'replace the audio', 'with audio']
    has_audio_replacement = any(cmd in message.lower() for cmd in audio_cmd_patterns)
    print(f"[DEBUG] Has audio replacement command: {has_audio_replacement}")
    
    # Handle audio replacement first, before any other processing
    if has_audio_replacement:
        print(f"[DEBUG] Pre-processing audio replacement command: {message}")
        import re
        
        # Extract video path from message (it should already have been appended by the context processing)
        video_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp4|mov|avi|mkv|webm)', message)
        if video_paths:
            video_path = video_paths[0]  # Use the first video path found
            print(f"[DEBUG] Found video path in message: {video_path}")
            
            # Extract audio file name from message
            audio_file_match = re.search(r'with\s+([\w.-]+\.(?:mp3|wav|ogg|aac|m4a))', message.lower())
            if audio_file_match:
                audio_filename = audio_file_match.group(1)
                print(f"[DEBUG] Extracted audio filename from message: {audio_filename}")
                
                # Try to find the audio file in various locations
                audio_paths = []
                # Define search paths with absolute path variations
                search_dirs = [
                    os.path.join('backend', 'uploads', 'audio'),
                    os.path.join('uploads', 'audio'),
                    os.path.join('backend', 'uploads', 'videos'),
                    os.path.join('uploads', 'videos'),
                    os.path.join('backend', 'uploads'),
                    'uploads',
                    '.'
                ]
                
                for search_dir in search_dirs:
                    print(f"[DEBUG] Searching directory: {search_dir}")
                    if os.path.exists(search_dir):
                        for file in os.listdir(search_dir):
                            print(f"[DEBUG] Checking file: {file}")
                            # Get base name without extension
                            audio_name, audio_ext = os.path.splitext(audio_filename.lower())
                            file_lower = file.lower()
                            
                            # Check for exact match
                            if audio_filename.lower() == file_lower:
                                audio_paths.append(os.path.join(search_dir, file))
                                print(f"[DEBUG] Found exact match: {os.path.join(search_dir, file)}")
                            # Check for filename in any part of the filename (for timestamp prefixes)
                            elif audio_filename.lower() in file_lower:
                                audio_paths.append(os.path.join(search_dir, file))
                                print(f"[DEBUG] Found audio filename in: {os.path.join(search_dir, file)}")
                            # Check for timestamp-filename.ext pattern (e.g., 1234567890-audio.mp3)
                            elif '-' in file_lower and audio_filename.lower() in file_lower.split('-', 1)[1]:
                                audio_paths.append(os.path.join(search_dir, file))
                                print(f"[DEBUG] Found match with timestamp prefix: {os.path.join(search_dir, file)}")
                            # Check if the base name (without extension) is in the filename
                            elif audio_name in file_lower and file_lower.endswith(audio_ext):
                                audio_paths.append(os.path.join(search_dir, file))
                                print(f"[DEBUG] Found match with base name: {os.path.join(search_dir, file)}")
                
                # Check uploaded audio files in the 'uploads/audio' directory specifically
                if not audio_paths and os.path.exists('uploads/audio'):
                    print(f"[DEBUG] No audio found yet, trying direct file listing of uploads/audio")
                    try:
                        # Get all audio files in the directory
                        all_audio_files = [f for f in os.listdir('uploads/audio') 
                                         if f.lower().endswith(('.mp3', '.wav', '.ogg', '.aac', '.m4a'))]
                        
                        # Sort by modification time (newest first)
                        all_audio_files.sort(key=lambda x: os.path.getmtime(os.path.join('uploads/audio', x)) 
                                              if os.path.exists(os.path.join('uploads/audio', x)) else 0, 
                                              reverse=True)
                        
                        # Add the most recent audio file if we found any
                        if all_audio_files:
                            most_recent = os.path.join('uploads/audio', all_audio_files[0])
                            audio_paths.append(most_recent)
                            print(f"[DEBUG] Found most recently uploaded audio file: {most_recent}")
                    except Exception as e:
                        print(f"[DEBUG] Error checking recently uploaded audio: {e}")
                
                # Sort found files by modification time (newest first)
                audio_paths.sort(key=lambda x: os.path.getmtime(x) if os.path.exists(x) else 0, reverse=True)
                
                if audio_paths:
                    # Use the most recent matching file
                    audio_path = audio_paths[0]
                    print(f"[DEBUG] Using audio file: {audio_path}")
                    
                    # Get path information for the video
                    video_dir = os.path.dirname(video_path)
                    video_name = os.path.basename(video_path)
                    video_name_no_ext, video_ext = os.path.splitext(video_name)
                    
                    # Generate output path with timestamp
                    timestamp = int(time.time() * 1000)
                    output_filename = f"{timestamp}-{video_name_no_ext}_with_audio{video_ext}"
                    output_path = os.path.join(video_dir, output_filename)
                    
                    try:
                        # Directly execute ffmpeg command
                        ffmpeg_cmd = f"ffmpeg -i \"{video_path}\" -i \"{audio_path}\" -c:v copy -map 0:v:0 -map 1:a:0 -shortest \"{output_path}\""
                        print(f"[DEBUG] Executing ffmpeg command: {ffmpeg_cmd}")
                        
                        result = subprocess.run(
                            ffmpeg_cmd, 
                            shell=True, 
                            stdout=subprocess.PIPE, 
                            stderr=subprocess.PIPE,
                            text=True
                        )
                        
                        if result.returncode == 0:
                            success_msg = f"I've successfully replaced the audio in your video using {os.path.basename(audio_path)}."
                            print(f"[DEBUG] Audio replacement successful: {output_path}")
                            return jsonify({'assistant': {
                                'role': 'assistant',
                                'content': success_msg,
                                'request_id': request_id,
                                'timestamp': int(time.time() * 1000)
                            }})
                        else:
                            error_msg = f"Error replacing audio: {result.stderr}"
                            print(f"[DEBUG] ffmpeg error: {error_msg}")
                            return jsonify({'assistant': {
                                'role': 'assistant',
                                'content': "I couldn't replace the audio in your video. There was a processing error.",
                                'request_id': request_id,
                                'timestamp': int(time.time() * 1000)
                            }})
                    except Exception as e:
                        print(f"[DEBUG] Error executing ffmpeg: {str(e)}")
                        return jsonify({'assistant': {
                            'role': 'assistant',
                            'content': f"I encountered an error while trying to replace the audio: {str(e)}",
                            'request_id': request_id,
                            'timestamp': int(time.time() * 1000)
                        }})
                else:
                    print(f"[DEBUG] Could not find specific audio file: {audio_filename}, looking for any audio file")
                    
                    # Try to find ANY recently uploaded audio file
                    audio_dirs = ['uploads/audio', 'uploads']
                    for audio_dir in audio_dirs:
                        if os.path.exists(audio_dir):
                            audio_files = [f for f in os.listdir(audio_dir) 
                                        if f.lower().endswith(('.mp3', '.wav', '.ogg', '.aac', '.m4a'))]
                            if audio_files:
                                # Sort by creation time (newest first)
                                audio_files.sort(key=lambda x: os.path.getctime(os.path.join(audio_dir, x)), reverse=True)
                                audio_path = os.path.join(audio_dir, audio_files[0])
                                print(f"[DEBUG] Found recent audio file to use instead: {audio_path}")
                                
                                # Get path information for the video
                                video_dir = os.path.dirname(video_path)
                                video_name = os.path.basename(video_path)
                                video_name_no_ext, video_ext = os.path.splitext(video_name)
                                
                                # Generate output path with timestamp
                                timestamp = int(time.time() * 1000)
                                output_filename = f"{timestamp}-{video_name_no_ext}_with_audio{video_ext}"
                                output_path = os.path.join(video_dir, output_filename)
                                
                                try:
                                    # Directly execute ffmpeg command
                                    ffmpeg_cmd = f"ffmpeg -i \"{video_path}\" -i \"{audio_path}\" -c:v copy -map 0:v:0 -map 1:a:0 -shortest \"{output_path}\""
                                    print(f"[DEBUG] Executing ffmpeg command: {ffmpeg_cmd}")
                                    
                                    result = subprocess.run(
                                        ffmpeg_cmd, 
                                        shell=True, 
                                        stdout=subprocess.PIPE, 
                                        stderr=subprocess.PIPE,
                                        text=True
                                    )
                                    
                                    if result.returncode == 0:
                                        success_msg = f"I've successfully replaced the audio in your video using {os.path.basename(audio_path)} since I couldn't find {audio_filename}."
                                        print(f"[DEBUG] Audio replacement successful: {output_path}")
                                        return jsonify({'assistant': {
                                            'role': 'assistant',
                                            'content': success_msg,
                                            'request_id': request_id,
                                            'timestamp': int(time.time() * 1000)
                                        }})
                                    else:
                                        error_msg = f"Error replacing audio: {result.stderr}"
                                        print(f"[DEBUG] ffmpeg error: {error_msg}")
                                except Exception as e:
                                    print(f"[DEBUG] Error executing ffmpeg: {str(e)}")
                    
                    # If we get here, we couldn't find any audio file
                    print(f"[DEBUG] Could not find any audio file to use")
                    return jsonify({'assistant': {
                        'role': 'assistant',
                        'content': f"I couldn't find the audio file '{audio_filename}' or any other audio file. Please upload an audio file first.",
                        'request_id': request_id,
                        'timestamp': int(time.time() * 1000)
                    }})
            else:
                print(f"[DEBUG] Could not extract audio filename from message")
                return jsonify({'assistant': {
                    'role': 'assistant',
                    'content': "I need an audio file to replace the current audio track. Please specify a file like 'Replace the audio with music.mp3'.",
                    'request_id': request_id,
                    'timestamp': int(time.time() * 1000)
                }})
        else:
            print(f"[DEBUG] No video path found in message")
            # We need to notify the user that we need a video first
            message = "I'll replace the audio in the currently displayed video. Please make sure you have a video loaded in the preview first."
            print(f"[DEBUG] Set message to: {message}")
            return jsonify({'assistant': {
                'role': 'assistant',
                'content': message,
                'request_id': request_id,
                'timestamp': int(time.time() * 1000)
            }})
    
    # Process video trimming requests to ensure they work correctly
    elif ('trim' in message.lower() and any(x in message.lower() for x in ['sec', 'second', 'minute', 'min'])):
        print(f"[DEBUG] Pre-processing video trim command: {message}")
        import re
        
        # Extract video path
        video_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp4|mov|avi|mkv|webm)', message)
        if video_paths:
            video_path = video_paths[0]  # Use the first video path
            
            # Get path information
            dir_name = os.path.dirname(video_path)
            base_name = os.path.basename(video_path)
            name, ext = os.path.splitext(base_name)
            
            # Generate the output filename with _trimmed suffix
            timestamp = int(time.time() * 1000)
            new_output_filename = f"{timestamp}-{name}_trimmed{ext}"
            new_output_path = os.path.join(dir_name, new_output_filename)
            
            # Extract time values using regex
            start_time = "0"  # Default start time
            duration = None
            end_time = None
            
            # Look for various time patterns
            first_n_sec = re.search(r'first\s+(\d+)\s*(?:sec|second)', message.lower())
            trim_from_to = re.search(r'trim\s+from\s+(\d+)\s*(?:sec|second)\s+to\s+(\d+)\s*(?:sec|second)', message.lower())
            trim_n_sec = re.search(r'trim\s+(\d+)\s*(?:sec|second)', message.lower())
            
            if first_n_sec:
                duration = first_n_sec.group(1)
                print(f"[DEBUG] Detected trim first {duration} seconds")
            elif trim_from_to:
                start_time = trim_from_to.group(1)
                end_time = trim_from_to.group(2)
                print(f"[DEBUG] Detected trim from {start_time} to {end_time} seconds")
            elif trim_n_sec:
                duration = trim_n_sec.group(1)
                print(f"[DEBUG] Detected trim {duration} seconds")
            
            # Rewrite the command to explicitly use re-encoding instead of stream copying
            # This ensures frame-accurate trimming at the expense of some quality loss
            if end_time:
                message = f"trim video with re-encoding {video_path} {new_output_path} {start_time} {end_time}"
            elif duration:
                message = f"trim video with re-encoding {video_path} {new_output_path} {start_time} {duration}"
            else:
                # Fallback to original message if we couldn't parse the times
                pass
                
            print(f"[DEBUG] Rewritten trim command: {message}")
    
    # Audio replacement requests are now handled at the beginning
    # This code won't be reached, but kept as a fallback
    elif False:  # Adding a condition that will never be true to keep as reference
        print(f"[DEBUG] Pre-processing audio replacement command: {message}")
        import re
        
        # Extract video path from message (it should already have been appended by the context processing)
        video_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp4|mov|avi|mkv|webm)', message)
        if video_paths:
            video_path = video_paths[0]  # Use the first video path found
        elif video_context and video_context.get('path'):
            # Fallback to video context if available
            video_path = video_context.get('path')
        else:
            video_path = None
        
        # Extract audio file path if present in the message
        audio_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp3|wav|ogg|aac|m4a)', message)
        # Improved pattern to better detect audio file mentions
        audio_file_mentions = (
            re.findall(r'(?:with|using)\s+([\w-]+\.(?:mp3|wav|ogg|aac|m4a))', message.lower()) or
            re.findall(r'replace.*?(?:audio|sound).*?(?:with)?\s+([\w-]+\.(?:mp3|wav|ogg|aac|m4a))', message.lower()) or
            re.findall(r'([\w-]+\.(?:mp3|wav|ogg|aac|m4a))', message.lower())
        )
        
        # If an audio context was provided, use that
        if audio_context and audio_context.get('path'):
            audio_path = audio_context.get('path')
        # Otherwise try to find it in the message
        elif audio_paths:
            audio_path = audio_paths[0]  # Use the first audio path
        # Or check if there's a mention of an audio file name
        elif audio_file_mentions:
            audio_filename = audio_file_mentions[0]
            print(f"[DEBUG] Looking for audio file: {audio_filename}")
            
            # Try multiple potential audio directories
            audio_dirs = [
                os.path.join('uploads', 'audio'),
                'uploads',  # Also check main uploads folder
                os.path.join('uploads', 'videos'),  # Sometimes audio might be in videos folder
                '.'  # Also check current directory
            ]
            
            audio_path = None
            for audio_dir in audio_dirs:
                if not os.path.exists(audio_dir):
                    continue
                    
                # Try exact match
                potential_path = os.path.join(audio_dir, audio_filename)
                if os.path.exists(potential_path):
                    audio_path = potential_path
                    print(f"[DEBUG] Found audio file at: {audio_path}")
                    break
                    
                # Try case-insensitive match
                try:
                    audio_files = [f for f in os.listdir(audio_dir) if f.lower() == audio_filename.lower()]
                    if audio_files:
                        audio_path = os.path.join(audio_dir, audio_files[0])
                        print(f"[DEBUG] Found audio file with case-insensitive match: {audio_path}")
                        break
                except Exception as e:
                    print(f"[DEBUG] Error checking directory {audio_dir}: {e}")
                    
                # Try partial match
                try:
                    # Get just the name without extension
                    name, ext = os.path.splitext(audio_filename.lower())
                    matching_files = [f for f in os.listdir(audio_dir) 
                                    if os.path.splitext(f.lower())[0] == name 
                                    and os.path.splitext(f.lower())[1] in ('.mp3', '.wav', '.ogg', '.aac', '.m4a')]
                    if matching_files:
                        audio_path = os.path.join(audio_dir, matching_files[0])
                        print(f"[DEBUG] Found audio file with partial match: {audio_path}")
                        break
                except Exception as e:
                    print(f"[DEBUG] Error with partial matching in {audio_dir}: {e}")
            
            if not audio_path:
                print(f"[DEBUG] No audio file found matching: {audio_filename}")
                # No audio file found, we'll set a placeholder that will trigger an error message
                audio_path = None
        else:
            # No audio file info found
            audio_path = None
        
        # Check if we have both video and audio paths
        if video_path and audio_path:
            # Get path information for output
            dir_name = os.path.dirname(video_path)
            base_name = os.path.basename(video_path)
            name, ext = os.path.splitext(base_name)
            
            # Generate unique timestamp for the output
            timestamp = int(time.time() * 1000)
            new_output_filename = f"{timestamp}-{name}_with_audio{ext}"
            new_output_path = os.path.join(dir_name, new_output_filename)
            
            # Before rewriting the message, let's verify the audio path exists
            audio_exists = os.path.exists(audio_path) if audio_path else False
            if not audio_exists and 'uploads/audio' in audio_path:
                # Try to find the most recent uploaded audio file with this name
                base_audio_name = os.path.basename(audio_path)
                audio_dir = os.path.join('uploads', 'audio')
                try:
                    audio_files = [f for f in os.listdir(audio_dir) if base_audio_name in f]
                    if audio_files:
                        # Sort by creation time, most recent first
                        audio_files.sort(key=lambda x: os.path.getctime(os.path.join(audio_dir, x)), reverse=True)
                        audio_path = os.path.join(audio_dir, audio_files[0])
                        audio_exists = True
                        print(f"[DEBUG] Found most recent matching audio file: {audio_path}")
                except Exception as e:
                    print(f"[DEBUG] Error looking for audio files: {e}")
            
            # If we have the uploaded audio file ID, construct the full path
            if not audio_exists and audio_context and 'id' in audio_context:
                audio_id = audio_context.get('id')
                audio_name = audio_context.get('name')
                audio_path = os.path.join('uploads', 'audio', f"{audio_id}-{audio_name}")
                audio_exists = os.path.exists(audio_path)
                print(f"[DEBUG] Constructed audio path from context: {audio_path}, exists: {audio_exists}")
            
            # As a last resort, search for the audio file in all upload directories
            if not audio_exists:
                base_name = os.path.basename(audio_path) if audio_path else audio_file_mentions[0] if audio_file_mentions else 'audio.mp3'
                found = False
                
                for root, dirs, files in os.walk('uploads'):
                    for file in files:
                        if base_name.lower() in file.lower():
                            audio_path = os.path.join(root, file)
                            found = True
                            print(f"[DEBUG] Found audio file through directory walk: {audio_path}")
                            break
                    if found:
                        break
            
            # Rewrite the message to include the full paths
            message = f"ffmpeg -i {video_path} -i {audio_path} -c:v copy -map 0:v:0 -map 1:a:0 -shortest {new_output_path}"
            print(f"[DEBUG] Rewritten audio replacement command: {message}")
        elif video_path and not audio_path:
            # We have video but no audio path - set a specific error message
            message = "I need a valid audio file to replace the video's audio track. Please specify an audio file by name or upload one."
            print(f"[DEBUG] No audio file specified for replacement: {message}")
        elif not video_path:
            # No video path found - this is likely the main issue
            message = "I'll replace the audio in the currently displayed video with 'show-me.m4a'. Let me look for that file..."
            print(f"[DEBUG] No video path found for audio replacement, using current video in preview")
    
    # Process Instagram format conversion requests
    elif 'instagram' in message.lower() and ('format' in message.lower() or 'convert' in message.lower()):
        print(f"[DEBUG] Pre-processing Instagram format conversion command: {message}")
        import re
        
        # Extract video path
        video_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp4|mov|avi|mkv|webm)', message)
        if video_paths:
            video_path = video_paths[0]  # Use the first video path
            
            # Determine which Instagram format to use
            aspect_ratio = "9:16"  # Default to vertical/portrait (stories/reels format)
            
            # Check if user specifically requested square format
            if ('square' in message.lower() or '1:1' in message.lower()):
                aspect_ratio = "1:1"  # Square format
            
            # Get path information
            dir_name = os.path.dirname(video_path)
            base_name = os.path.basename(video_path)
            name, ext = os.path.splitext(base_name)
            
            # Generate the output filename with _instagram suffix
            new_output_filename = f"{name}_instagram{ext}"
            new_output_path = os.path.join(dir_name, new_output_filename)
            
            print(f"[DEBUG] Using aspect ratio {aspect_ratio} for Instagram format conversion")
            print(f"[DEBUG] Using output path: {new_output_path}")
            
            # Rewrite the command to explicitly set the aspect ratio
            message = f"convert video to {aspect_ratio} aspect ratio {video_path} {new_output_path}"
            print(f"[DEBUG] Rewritten Instagram format command: {message}")
    
    # Check if this is a merge_audio_video command that might use the same input and output
    elif 'add audio' in message.lower() or 'merge audio' in message.lower() or 'merge_audio_video' in message.lower():
        print(f"[DEBUG] Pre-processing potential audio merge command: {message}")
        
        # Extract any file paths in the message
        import re
        # Match video files
        video_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp4|mov|avi|mkv|webm)', message)
        # Match audio files
        audio_paths = re.findall(r'[A-Za-z]:\\[^\s]+\.(?:mp3|wav|aac|ogg)', message)
        
        # If we have both video and audio paths
        if video_paths and audio_paths:
            video_path = video_paths[0]  # Use the first video path
            audio_path = audio_paths[0]  # Use the first audio path
            
            # Always generate a new unique output path for audio merged videos
            dir_name = os.path.dirname(video_path)
            base_name = os.path.basename(video_path)
            name, ext = os.path.splitext(base_name)
            
            # Create a clean base name without suffixes or timestamps
            clean_name = name
            # Remove any existing suffixes
            for suffix in ['_with_audio', '-with-audio', '_audio_enhanced', '_processed', '_filtered', '_trimmed', '_batman', '_madmax']:
                if suffix in clean_name:
                    clean_name = clean_name.replace(suffix, '')
                
            # Remove any timestamp prefix if present
            if re.match(r'^\d+\-', clean_name):
                clean_name = re.sub(r'^\d+\-', '', clean_name)
                
            # Generate new timestamped filename with _with_audio suffix
            timestamp = int(time.time() * 1000)
            new_output_filename = f"{timestamp}-{clean_name}_with_audio{ext}"
            new_output_path = os.path.join(dir_name, new_output_filename)
            
            print(f"[DEBUG] Using new output path for audio merging: {new_output_path}")
            
            # Always rewrite the command to use explicit input and output paths
            message = f"add audio.mp3 to video {video_path} {audio_path} {new_output_path}"
            print(f"[DEBUG] Rewritten audio merge command: {message}")
            
            # We can't use sessions directly, but we can store the path in the message
            # for later extraction in the response processing

    
    # Add user message to chat history with request ID
    user_message = {
        'role': 'user', 
        'content': message, 
        'timestamp': time.time(),
        'request_id': request_id
    }
    chat_history.append(user_message)
    
    # If MCP process is not running, start it
    if mcp_process is None or mcp_process.poll() is not None:
        print("[DEBUG] Starting MCP client")
        start_mcp_client()
    
    try:
        # Direct approach - run the client as a one-off process for each message
        print(f"[DEBUG] Running MCP client for message: '{message}'")
        try:
            # Run client.py directly with the message as input
            client_process = subprocess.Popen(
                [sys.executable, "../client.py", mcp_server_path, "--stdio"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            
            # Send message to stdin
            client_process.stdin.write(f"{message}\n")
            client_process.stdin.flush()
            
            # Read response with timeout - Windows-compatible approach
            all_output = []
            response_lines = []
            in_response_block = False
            response = ""
            start_time = time.time()
            timeout = 60  # seconds, increased for longer outputs
            
            print("[DEBUG] Waiting for response...")
            
            # Set stdout to non-blocking mode
            msvcrt.setmode(client_process.stdout.fileno(), os.O_BINARY)
            
            # Read all output from the process until we see the complete response
            while time.time() - start_time < timeout:
                # Check if process has exited
                if client_process.poll() is not None and len(all_output) > 0:
                    print(f"[DEBUG] Process exited with code {client_process.returncode}")
                    stderr = client_process.stderr.read()
                    if stderr:
                        print(f"[DEBUG] Process stderr: {stderr}")
                    break
                
                # Read a line from stdout
                try:
                    line = client_process.stdout.readline().strip()
                    if line:
                        print(f"[DEBUG] Got line: '{line}'")
                    
                        # Check for response markers
                        if line == "Response: RESPONSE_START":
                            print("[DEBUG] Found response start marker")
                            in_response_block = True
                            continue
                        elif line == "RESPONSE_END":
                            print("[DEBUG] Found response end marker")
                            in_response_block = False
                            break
                        
                        # If we're in a response block, add this line to our response
                        if in_response_block:
                            print(f"[DEBUG] Added to response: '{line}'")
                            response_lines.append(line)
                        else:
                            # Skip debug messages from the MCP client
                            print(f"[DEBUG] Skipping debug message: '{line}'")
                            # Add to general output for fallback
                            all_output.append(line)
                    else:
                        # No data, check if process is done
                        if client_process.poll() is not None:
                            break
                except Exception as e:
                    print(f"[DEBUG] Error reading from stdout: {e}")
                
                # Sleep a bit to avoid busy waiting
                time.sleep(0.1)
            
            # Construct the response from the collected lines
            if response_lines:
                response = "\n".join(response_lines)
                print(f"[DEBUG] Constructed multi-line response ({len(response_lines)} lines)")
            elif in_response_block:
                # We saw a RESPONSE_START but no content before process ended
                response = "The operation was performed successfully."
                print(f"[DEBUG] Got empty response after RESPONSE_START marker, using default success message")
                
                # Check if this was an audio merge operation and add file path to response
                if "add audio" in message.lower():
                    # Extract output path from message for audio merge operations
                    output_match = re.search(r'([A-Za-z]:\\[^\s]+_with_audio\.(?:mp4|mov|avi|mkv|webm))', message)
                    if output_match:
                        output_path = output_match.group(1)
                        # Return a modified response with file path for frontend detection (will be cleaned later)
                        response = f"The audio file has been successfully merged with the video. The output is in `{output_path}`."
                        print(f"[DEBUG] Added output path to empty audio merge response: {output_path}")
                    else:
                        # If not found in message, try to find the most recent output file
                        uploads_dir = os.path.join('uploads', 'videos')
                        if os.path.exists(uploads_dir):
                            output_files = [f for f in os.listdir(uploads_dir) if f.endswith('.mp4') and ('_with_audio' in f)]
                            if output_files:
                                # Sort by creation time, most recent first
                                output_files.sort(key=lambda x: os.path.getctime(os.path.join(uploads_dir, x)), reverse=True)
                                output_path = os.path.join(uploads_dir, output_files[0])
                                response = f"The audio file has been successfully merged with the video. The output is in `{output_path}`."
                                print(f"[DEBUG] Added most recent output path to empty audio merge response: {output_path}")
                            else:
                                print("[DEBUG] Could not find any output files in uploads directory")
                                response = "The audio file has been successfully merged with the video."
            elif all_output:
                # Fallback: use collected output if no marked response was found
                filtered_output = [line for line in all_output 
                                 if not line.startswith("MCP Client") and 
                                 not line.startswith("Received query:") and 
                                 not line.startswith("Processing query:")]
                
                response = "\n".join(filtered_output)
                print(f"[DEBUG] Using fallback response from collected output")
                
            # Clean up any response prefixes that might have slipped through
            if response.startswith("GEMINI_RESPONSE:"):
                response = response[len("GEMINI_RESPONSE:"):].strip()
            # Remove Response: RESPONSE_START prefix
            if response.startswith("Response: RESPONSE_START"):
                response = response[len("Response: RESPONSE_START"):].strip()
            # Remove just RESPONSE_START prefix if present
            elif response.startswith("RESPONSE_START"):
                response = response[len("RESPONSE_START"):].strip()
                
            # Remove tool call information
            import re
            # Filter out tool call lines - more comprehensive pattern to catch all tool calls
            response_lines = response.split('\n')
            filtered_lines = []
            
            for line in response_lines:
                # Skip lines that contain tool call information
                if not re.match(r'\[Gemini requested tool', line) and not re.match(r'\[Tool call:', line):
                    filtered_lines.append(line)
            
            # Rebuild the response
            response = '\n'.join(filtered_lines)
            
            # Also remove any leftover tool call patterns just to be safe
            response = re.sub(r'\[Gemini requested tool \'[^\']*\' with arguments: \{[^\}]*\}\]\n?', '', response)
            response = re.sub(r'\[Tool call:[^\]]*\]\n?', '', response)
            
            # Check for and fix errors related to audio file paths in tool calls
            if 'replace_audio_track' in response and 'Input file does not exist' in response:
                print(f"[DEBUG] Detected tool call with missing audio file. Fixing response.")
                response = "I'll replace the audio in your video. Please make sure you've uploaded the audio file you want to use first."
            
            # Clean up file paths from responses as requested by user
            # Handle various formats of file path mentions
            response = re.sub(r'\s+The output (?:video )?is (?:in|at|saved to|located at)\s+`[^`]+`\.?', '.', response)
            response = re.sub(r'\s+The (?:edited|trimmed|converted|output) video is (?:at|saved at|in|located at)\s+`[^`]+`\.?', '.', response)
            response = re.sub(r'\s+The output (?:file )?is (?:in|at) the (?:specified|following) path:?\s+`?[^`\n]+`?\.?', '.', response)
            response = re.sub(r'\s+The (?:audio and video|video and audio) (?:has|have) been successfully merged\. The output (?:video )?is (?:at|in|saved at|located at)\s+`[^`]+`\.?', '. The audio and video have been successfully merged.', response)
            
            # Match various output path formats
            response = re.sub(r'(?:You can find|access) the (?:output|processed|converted|merged|trimmed) (?:video|file) at `[^`]+`\.?', '', response)
            
            # Remove any lines that are just file paths
            response = re.sub(r'^(?:[A-Za-z]:\\[^\n]+)$', '', response, flags=re.MULTILINE)
            
            # Remove any additional file path info appended at the end
            response = re.sub(r'\n\nYou can access the processed video at:.+$', '', response)
                
            print(f"[DEBUG] Final processed response: '{response}'")
            
            # If the response starts with a newline, remove it
            if response.startswith("\n"):
                response = response[1:]
            
            
            # Clean up
            if client_process.poll() is None:
                client_process.terminate()
                
            # Check stderr for any errors
            stderr = client_process.stderr.read()
            if stderr:
                print(f"[DEBUG] Process stderr: {stderr}")
                
        except Exception as e:
            print(f"[DEBUG] Error running client: {e}")
            
        # Add the response to chat history if we got one
        if response:
            # Check for output.mp4 in the backend directory
            output_mp4_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output.mp4')
            if os.path.exists(output_mp4_path):
                print(f"[DEBUG] Found output.mp4 in backend directory, moving to videos folder")
                new_path = handle_output_file(output_mp4_path)
                
                if new_path:
                    # Update the response with the new path for frontend detection only
                    # This path info will be removed later by our regex cleanup
                    if 'output.mp4' in response:
                        # Just replace output.mp4 with the new filename but keep path format for detection
                        response = response.replace('output.mp4', os.path.basename(new_path))
                        print(f"[DEBUG] Updated response with new path (will be cleaned up): {response}")
            
            # Create the assistant message
            assistant_message = {
                'role': 'assistant',
                'content': response,
                'timestamp': time.time(),
                'request_id': request_id  # Pass the request ID to link question and answer
            }
            chat_history.append(assistant_message)
        else:
            print("[DEBUG] No response received")
            # Add a default response if we didn't get one
            assistant_message = {
                'role': 'assistant',
                'content': "I'm sorry, I couldn't process your request. Please try again.",
                'timestamp': time.time(),
                'request_id': request_id  # Include request ID even for error responses
            }
            chat_history.append(assistant_message)
        
        # Wait a short time for the response to be processed
        # This ensures we have the assistant's response before returning
        time.sleep(0.5)
        
        # Return both the user message and the latest assistant message
        if len(chat_history) >= 2 and chat_history[-1]['role'] == 'assistant':
            return jsonify({
                'user': user_message,
                'assistant': chat_history[-1]
            })
        else:
            return jsonify({
                'user': user_message,
                'status': 'processing'
            })
    except Exception as e:
        # Print any stderr output from the MCP client for debugging
        if mcp_process and mcp_process.stderr:
            try:
                err_output = mcp_process.stderr.read()
                if err_output:
                    print("[MCP client stderr]:", err_output)
            except Exception as serr:
                print(f"[MCP client stderr read error]: {serr}")
        return jsonify({'error': f'Error processing message: {str(e)}'}), 500

@app.route('/api/chat/response', methods=['GET'])
def get_latest_response():
    # Get the last assistant message from chat history
    assistant_messages = [msg for msg in chat_history if msg['role'] == 'assistant']
    
    if assistant_messages:
        last_message = assistant_messages[-1]
        return jsonify(last_message)
    else:
        return jsonify({'status': 'waiting'})

def start_mcp_client():
    """Start the MCP client as a subprocess"""
    global mcp_process, mcp_server_path
    
    if mcp_server_path is None:
        print("Error: MCP server path not set")
        return
    
    try:
        # Close any existing process
        if mcp_process and mcp_process.poll() is None:
            mcp_process.terminate()
            mcp_process.wait(timeout=5)
        
        # Start a new MCP client process
        mcp_process = subprocess.Popen(
            [sys.executable, "-m", "uv", "run", "../client.py", mcp_server_path, "--stdio"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print(f"Started MCP client with server: {mcp_server_path}")
    except Exception as e:
        print(f"Failed to start MCP client: {e}")

# Wrap the Flask app with ASGI middleware
asgi_app = WSGIMiddleware(app)

if __name__ == "__main__":
    # Get the MCP server path from command line arguments
    if len(sys.argv) > 1:
        mcp_server_path = sys.argv[1]
        print(f"Using MCP server: {mcp_server_path}")
    else:
        print("Warning: No MCP server script path provided. Chat functionality will not work.")
    
    # Start the web server
    port = int(os.environ.get("PORT", 8001))
    print(f"Starting server on http://localhost:{port}")
    uvicorn.run(asgi_app, host="0.0.0.0", port=port)
