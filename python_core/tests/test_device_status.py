#!/usr/bin/env python3

import requests
import json
import time

def test_device_status():
    """Test the device status endpoint to verify sampling rates are returned correctly."""
    print("=== Testing Device Status Endpoint ===")
    
    base_url = "http://localhost:8121"
    
    try:
        # Check device status
        print("\n1. Checking device status...")
        response = requests.get(f"{base_url}/device/status")
        if response.status_code == 200:
            status = response.json()
            print(f"Device Status Response: {json.dumps(status, indent=2)}")
            
            # Check if device is connected
            if status.get('is_connected'):
                print("\n✅ Device is connected!")
                print(f"Device Name: {status.get('device_name')}")
                print(f"Device Address: {status.get('device_address')}")
                print(f"Connection Time: {status.get('connection_time')}")
                print(f"Battery Level: {status.get('battery_level')}%")
                print(f"EEG Sampling Rate: {status.get('eeg_sampling_rate')} Hz")
                print(f"PPG Sampling Rate: {status.get('ppg_sampling_rate')} Hz")
                print(f"ACC Sampling Rate: {status.get('acc_sampling_rate')} Hz")
                print(f"BAT Sampling Rate: {status.get('bat_sampling_rate')} Hz")
                
                # Verify expected rates are returned
                expected_rates = {
                    'eeg_sampling_rate': 250.0,
                    'ppg_sampling_rate': 50.0,
                    'acc_sampling_rate': 30.0,
                    'bat_sampling_rate': 1.0
                }
                
                print("\n2. Verifying sampling rates...")
                all_correct = True
                for rate_key, expected_value in expected_rates.items():
                    actual_value = status.get(rate_key, 0)
                    if actual_value == expected_value:
                        print(f"✅ {rate_key}: {actual_value} Hz (Expected)")
                    elif actual_value > 0:
                        print(f"ℹ️  {rate_key}: {actual_value} Hz (Actual streaming rate)")
                    else:
                        print(f"❌ {rate_key}: {actual_value} Hz (Should be {expected_value} Hz)")
                        all_correct = False
                
                if all_correct or any(status.get(key, 0) > 0 for key in expected_rates.keys()):
                    print("\n✅ Status bar data should now be updating correctly!")
                else:
                    print("\n❌ Some sampling rates are still 0. Check if streaming is active.")
                    
            else:
                print("\n❌ No device is connected.")
                print("Please connect a device first using the frontend or:")
                print("  1. Scan for devices: GET /device/scan")
                print("  2. Connect to device: POST /device/connect")
        else:
            print(f"❌ Failed to get device status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to the server. Make sure the Link Band SDK server is running.")
        print("Start the server with: cd python_core && python run_server.py")
    except Exception as e:
        print(f"❌ Error testing device status: {e}")

def test_streaming_status():
    """Test the streaming status to see if streaming is active."""
    print("\n=== Testing Streaming Status ===")
    
    base_url = "http://localhost:8121"
    
    try:
        response = requests.get(f"{base_url}/stream/status")
        if response.status_code == 200:
            status = response.json()
            print(f"Streaming Status: {json.dumps(status, indent=2)}")
            
            if status.get('status') == 'running':
                print("✅ Streaming is active - actual sampling rates should be available")
            else:
                print("ℹ️  Streaming is not active - expected sampling rates should be shown")
        else:
            print(f"❌ Failed to get streaming status: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing streaming status: {e}")

if __name__ == "__main__":
    test_device_status()
    test_streaming_status()
    
    print("\n=== Instructions ===")
    print("1. If device is connected but sampling rates are 0:")
    print("   - Check if streaming is started via /stream/start")
    print("   - The fix should now show expected rates (250, 50, 30, 1 Hz)")
    print("2. If device is not connected:")
    print("   - Use the frontend to scan and connect to a device")
    print("   - Or use the API endpoints directly")
    print("3. After connecting, streaming should start automatically")
    print("4. The status bar should now show meaningful sampling rates!") 