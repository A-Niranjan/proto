# Video Editing Studio

A simple video editing UI with React.js frontend and Flask backend, integrated with MCP (Model Context Protocol) for video processing.

## Features

- Upload and view videos
- Preview selected videos
- Functional AI chatbox that interacts with MCP tools
- Responsive and aesthetic UI design
- Real-time update of processed videos

## Project Structure

The project consists of two main parts:

1. **Backend**: Flask server that:
   - Serves the React frontend
   - Handles video uploads and management
   - Connects to MCP tools for video processing
   - Exposes APIs for the frontend

2. **Frontend**: React.js application with:
   - Modern, responsive UI using Material-UI
   - Media library panel for video upload and selection
   - Video preview panel
   - AI chat interface for video editing commands

## Prerequisites

- Python 3.8+
- Node.js 14+
- MCP server for video processing (ffmpeg-helper)

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the frontend:
   ```bash
   npm run build
   ```

## Running the Application

### Development Mode

1. Start the backend server (from the backend directory):
   ```bash
   python server.py path/to/mcp_ffmpeg_helper.py
   ```

2. Start the frontend development server (from the frontend directory):
   ```bash
   npm start
   ```

3. Access the application at http://localhost:3000

### Production Mode

1. Build the frontend (from the frontend directory):
   ```bash
   npm run build
   ```

2. Start the backend server which will serve the built frontend:
   ```bash
   python backend/server.py path/to/mcp_ffmpeg_helper.py
   ```

3. Access the application at http://localhost:8000

## Usage

1. **Upload Videos**: Use the upload button in the Media Library panel
2. **Select Videos**: Click on a video from the Media Library to preview it
3. **Edit Videos**: Use the AI Assistant chat to send editing commands
   - Example commands:
     - "Trim the first 5 seconds of the video"
     - "Convert this video to MP4 format"
     - "Extract audio from this video"
     - "Add a watermark to the video"

## Technology Stack

- Backend: Flask, Python, MCP
- Frontend: React.js, Material-UI
- Video Processing: MCP FFmpeg helper tools
