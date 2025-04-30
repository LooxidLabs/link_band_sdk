# .vscode/run_server.py (원래 코드로 복원)
import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the parent directory to Python path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from server import WebSocketServer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# run_server.py 수정
async def main():
    try:
        # Create and start the WebSocket server
        server = WebSocketServer()
        await server.start()
        
        # Keep the server running
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
    finally:
        await server.stop()

if __name__ == "__main__":
    asyncio.run(main())
