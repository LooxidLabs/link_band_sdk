#!/usr/bin/env python3
"""
Simple WebSocket Test Script for Link Band SDK
"""
import asyncio
import json
import websockets
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_websocket_connection():
    """Test WebSocket connection to Link Band server"""
    import socket
    
    # Check if FastAPI server is running (WebSocket will be on same port)
    logger.info("Checking if FastAPI server (port 8121) is running for WebSocket...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex(('localhost', 8121))
        sock.close()
        
        if result == 0:
            logger.info("Port 8121 is open - WebSocket should be available at /ws endpoint")
        else:
            logger.error(f"Port 8121 is not accepting connections (error code: {result})")
            logger.error("FastAPI server is not running")
            return
    except Exception as e:
        logger.error(f"Failed to check port 8121: {e}")
        return
    
    # Now try WebSocket connection
    uri = "ws://localhost:8121/ws"  # FastAPI WebSocket endpoint
    
    try:
        logger.info(f"Attempting WebSocket connection to {uri}")
        
        # Try with detailed error handling (Windows compatible)
        # Use asyncio.wait_for for timeout instead of websockets timeout parameter
        connection_task = websockets.connect(
            uri,
            ping_interval=None,  # Disable ping for testing
        )
        
        websocket = await asyncio.wait_for(connection_task, timeout=10.0)
        
        async with websocket:
            logger.info("WebSocket connection successful!")
            
            # Test 1: Send health check
            logger.info("Sending health check command...")
            health_check = {"command": "health_check"}
            await websocket.send(json.dumps(health_check))
            logger.info(f"Sent: {health_check}")
            
            # Wait for response with longer timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                logger.info(f"Received response: {response}")
                
                # Try to parse JSON
                try:
                    parsed = json.loads(response)
                    logger.info(f"Parsed JSON: {parsed}")
                except json.JSONDecodeError:
                    logger.warning("Response is not valid JSON")
                    
            except asyncio.TimeoutError:
                logger.warning("No response received within 10 seconds")
                logger.info("This might indicate the server received the message but didn't respond")
            
            # Test 2: Check device connection
            logger.info("Sending device connection check...")
            device_check = {"command": "check_device_connection"}
            await websocket.send(json.dumps(device_check))
            logger.info(f"Sent: {device_check}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                logger.info(f"Received response: {response}")
                
                try:
                    parsed = json.loads(response)
                    logger.info(f"Parsed JSON: {parsed}")
                except json.JSONDecodeError:
                    logger.warning("Response is not valid JSON")
                    
            except asyncio.TimeoutError:
                logger.warning("No response received within 10 seconds")
            
            logger.info("WebSocket test completed successfully!")
            
    except ConnectionRefusedError as e:
        logger.error(f"Connection refused: {e}")
        logger.error("This means no server is listening on port 18765")
        logger.error("Check if the WebSocket server started properly in the main server logs")
    except websockets.exceptions.InvalidURI as e:
        logger.error(f"Invalid WebSocket URI: {e}")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.error(f"WebSocket connection closed unexpectedly: {e}")
        logger.error(f"Close code: {e.code}, Close reason: {e.reason}")
    except websockets.exceptions.WebSocketException as e:
        logger.error(f"WebSocket error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
    except asyncio.TimeoutError:
        logger.error("Connection timeout - server is not responding")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")

async def test_rest_api():
    """Test REST API connection"""
    import socket
    
    # First check if port 8121 is open
    logger.info("Checking if port 8121 is open...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex(('localhost', 8121))
        sock.close()
        
        if result == 0:
            logger.info("Port 8121 is open and accepting connections")
        else:
            logger.error(f"Port 8121 is not accepting connections (error code: {result})")
            return
    except Exception as e:
        logger.error(f"Failed to check port 8121: {e}")
        return
    
    # Try REST API call
    try:
        logger.info("Testing REST API connection...")
        
        # Use Python requests if available, otherwise try curl
        try:
            import urllib.request
            import urllib.error
            
            with urllib.request.urlopen("http://localhost:8121/", timeout=5) as response:
                data = response.read().decode('utf-8')
                logger.info(f"REST API working: {data}")
                
        except ImportError:
            # Fallback to curl
            import subprocess
            result = subprocess.run(
                ["curl", "-s", "http://localhost:8121/"], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode == 0:
                logger.info(f"REST API working: {result.stdout.strip()}")
            else:
                logger.error(f"REST API error: {result.stderr}")
                
    except Exception as e:
        logger.error(f"REST API test failed: {e}")

async def main():
    """Run all tests"""
    logger.info("Starting Link Band SDK WebSocket Test")
    logger.info("=" * 50)
    
    # Test REST API first
    await test_rest_api()
    
    logger.info("-" * 50)
    
    # Test WebSocket
    await test_websocket_connection()
    
    logger.info("=" * 50)
    logger.info("Test completed")

if __name__ == "__main__":
    asyncio.run(main()) 