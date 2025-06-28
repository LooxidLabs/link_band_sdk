#!/usr/bin/env python3

import requests
import json

def test_recording_status():
    print("=== Testing Recording Status ===")
    
    # Check API recording status
    try:
        response = requests.get("http://localhost:8121/data/recording-status")
        api_status = response.json()
        print(f"API Recording Status: {json.dumps(api_status, indent=2)}")
    except Exception as e:
        print(f"Error checking API status: {e}")
    
    # Start recording
    try:
        print("\n=== Starting Recording ===")
        response = requests.post(
            "http://localhost:8121/data/start-recording",
            headers={"Content-Type": "application/json"},
            json={"session_name": "test_status"}
        )
        print(f"Start Recording Response: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check status again
        response = requests.get("http://localhost:8121/data/recording-status")
        api_status = response.json()
        print(f"API Recording Status After Start: {json.dumps(api_status, indent=2)}")
        
    except Exception as e:
        print(f"Error starting recording: {e}")

if __name__ == "__main__":
    test_recording_status() 