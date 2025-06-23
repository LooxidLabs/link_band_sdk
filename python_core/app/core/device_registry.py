import json
import os
import logging
from typing import Dict, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class DeviceRegistry:
    def __init__(self, registry_file: str = "registered_devices.json"):
        self.registry_file = registry_file
        self.registered_devices: Dict[str, Dict] = {}
        self.load_registry()

    def load_registry(self):
        """Load registered devices from file"""
        try:
            if os.path.exists(self.registry_file):
                with open(self.registry_file, 'r') as f:
                    self.registered_devices = json.load(f)
                logger.info(f"Loaded {len(self.registered_devices)} registered devices")
            else:
                logger.info("No registry file found, starting with empty registry")
        except Exception as e:
            logger.error(f"Error loading registry: {e}")
            self.registered_devices = {}

    def save_registry(self):
        """Save registered devices to file"""
        try:
            with open(self.registry_file, 'w') as f:
                json.dump(self.registered_devices, f, indent=2)
            logger.info(f"Saved {len(self.registered_devices)} registered devices")
        except Exception as e:
            logger.error(f"Error saving registry: {e}")

    def register_device(self, device_info: Dict) -> bool:
        """Register a new device"""
        try:
            address = device_info.get('address')
            if not address:
                logger.error("Device address is required")
                return False

            self.registered_devices[address] = device_info
            self.save_registry()
            logger.info(f"Registered device: {address}")
            return True
        except Exception as e:
            logger.error(f"Error registering device: {e}")
            return False

    def unregister_device(self, address: str) -> bool:
        """Unregister a device"""
        try:
            if address in self.registered_devices:
                del self.registered_devices[address]
                self.save_registry()
                logger.info(f"Unregistered device: {address}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error unregistering device: {e}")
            return False

    def get_registered_devices(self) -> List[Dict]:
        """Get all registered devices"""
        return list(self.registered_devices.values())

    def is_device_registered(self, address: str) -> bool:
        """Check if a device is registered"""
        return address in self.registered_devices

    def get_device_info(self, address: str) -> Optional[Dict]:
        """Get info for a specific device"""
        return self.registered_devices.get(address) 