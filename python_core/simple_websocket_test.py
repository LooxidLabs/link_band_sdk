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
    uri = "ws://localhost:18765/"
    
    try:
        logger.info(f" Attempting to connect to {uri}")
        async with websockets.connect(uri) as websocket:
            logger.info("WebSocket connection successful!")
            
            # Test 1: Send health check
            logger.info(" Sending health check...")
            health_check = {"command": "health_check"}
            await websocket.send(json.dumps(health_check))
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f" Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("??No response received within 5 seconds")
            
            # Test 2: Check device connection
            logger.info(" Checking device connection...")
            device_check = {"command": "check_device_connection"}
            await websocket.send(json.dumps(device_check))
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f" Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("No response received within 5 seconds")
            
            logger.info("WebSocket test completed successfully!")
            
    except ConnectionRefusedError:
        logger.error("Connection refused - Is the server running on port 18765?")
    except websockets.exceptions.InvalidURI:
        logger.error("Invalid WebSocket URI")
    except Exception as e:
        logger.error(f"WebSocket test failed: {e}")

async def test_rest_api():
    """Test REST API connection"""
    import subprocess
    
    try:
        logger.info(" Testing REST API connection...")
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

    logger.info("=" * 50)
async def main():
    """Run all tests"""
    logger.info("Starting Link Band SDK WebSocket Test")
    
    # Test REST API first
    await test_rest_api()
    
    logger.info("-" * 50)
    
    # Test WebSocket
    await test_websocket_connection()
    
    logger.info("=" * 50)
    logger.info(" Test completed")

if __name__ == "__main__":
    asyncio.run(main()) 