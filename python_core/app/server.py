from typing import Dict, Any
from fastapi import WebSocket
from log import logger

class Server:
    def __init__(self, stream_engine):
        self.stream_engine = stream_engine

    async def handle_sensor_data(self, websocket: WebSocket, data: Dict[str, Any]):
        """Handle incoming sensor data"""
        try:
            sensor_type = data.get('sensor_type')
            if not sensor_type:
                logger.warning("No sensor type specified in data")
                return

            logger.info(f"Received sensor data of type: {sensor_type}")
            logger.debug(f"Data content: {data}")
            
            # Process and send data
            await self.stream_engine.process_and_send_data(sensor_type, [data])
            logger.info(f"Processed and sent {sensor_type} data")

        except Exception as e:
            logger.error(f"Error handling sensor data: {e}", exc_info=True)

    async def handle_batch_sensor_data(self, websocket: WebSocket, data: Dict[str, Any]):
        """Handle incoming batch sensor data"""
        try:
            sensor_type = data.get('sensor_type')
            batch_data = data.get('data', [])
            
            if not sensor_type or not batch_data:
                logger.warning("Invalid batch data format")
                return

            logger.info(f"Received batch sensor data of type: {sensor_type} with {len(batch_data)} samples")
            logger.debug(f"Batch data content: {batch_data}")
            
            # Process and send data
            await self.stream_engine.process_and_send_data(sensor_type, batch_data)
            logger.info(f"Processed and sent batch {sensor_type} data")

        except Exception as e:
            logger.error(f"Error handling batch sensor data: {e}", exc_info=True) 