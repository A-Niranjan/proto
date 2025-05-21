# Video Editing Studio Backend

This is the backend server for the Video Editing Studio application. It serves the React frontend and provides APIs for video upload, listing, and processing through MCP.

## Setup

1. Make sure you have Python 3.8+ installed
2. Create and activate a virtual environment
3. Install the requirements:

```bash
pip install -r requirements.txt
```

## Running the Server

To run the server, use the following command from the backend directory:

```bash
python server.py <path_to_mcp_server_script>
```

For example:
```bash
python server.py ../path/to/ffmpeg_helper.py
```

The server will start on http://localhost:8000
