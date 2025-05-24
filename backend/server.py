import os
import json
import sys
import threading
import asyncio
import time
import subprocess
import msvcrt
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uvicorn
from a2wsgi import WSGIMiddleware
from media_utils import save_media_file, delete_temp_file, clean_temp_files, get_all_media, VIDEOS_FOLDER, PHOTOS_FOLDER, AUDIO_FOLDER, TEMP_FOLDER

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

@app.route('/api/chat', methods=['POST'])
def send_message():
    global mcp_process
    
    data = request.json
    message = data.get('message', '')
    print(f"\n[DEBUG] Received message: '{message}'")
    
    if not message:
        return jsonify({'error': 'Empty message'}), 400
    
    # Add user message to chat history
    user_message = {'role': 'user', 'content': message, 'timestamp': time.time()}
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
                        
                        # Skip common debug messages
                        if line.startswith("MCP Client in stdio mode") or \
                           line.startswith("Received query:") or \
                           line.startswith("Processing query:"):
                            print(f"[DEBUG] Skipping debug message: '{line}'")
                            continue
                        
                        # Look for response markers
                        if line == "RESPONSE_START":
                            print("[DEBUG] Found response start marker")
                            in_response_block = True
                            continue
                        elif line == "RESPONSE_END":
                            print("[DEBUG] Found response end marker")
                            in_response_block = False
                            # We've got the complete response, exit the loop
                            break
                        elif in_response_block:
                            # Add this line to our response
                            response_lines.append(line)
                            print(f"[DEBUG] Added to response: '{line}'")
                        else:
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
            # Look for tool call patterns and remove them
            response = re.sub(r'\[Gemini requested tool \'[^\']*\' with arguments: \{[^\}]*\}\]\n?', '', response)
                
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
            print(f"[DEBUG] Got response: '{response}'")
            assistant_message = {
                'role': 'assistant',
                'content': response,
                'timestamp': time.time()
            }
            chat_history.append(assistant_message)
        else:
            print("[DEBUG] No response received")
            # Add a default response if we didn't get one
            assistant_message = {
                'role': 'assistant',
                'content': "I'm sorry, I couldn't process your request. Please try again.",
                'timestamp': time.time()
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
