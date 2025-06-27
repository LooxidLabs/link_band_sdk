#!/usr/bin/env python3
"""
Test script to verify FastAPI imports work correctly
"""

def test_imports():
    print("Testing FastAPI imports...")
    
    try:
        from fastapi import FastAPI
        print("✅ fastapi.FastAPI - OK")
    except ImportError as e:
        print(f"❌ fastapi.FastAPI - FAILED: {e}")
    
    try:
        from fastapi.staticfiles import StaticFiles
        print("✅ fastapi.staticfiles.StaticFiles - OK")
    except ImportError as e:
        print(f"❌ fastapi.staticfiles.StaticFiles - FAILED: {e}")
    
    try:
        from fastapi.responses import JSONResponse
        print("✅ fastapi.responses.JSONResponse - OK")
    except ImportError as e:
        print(f"❌ fastapi.responses.JSONResponse - FAILED: {e}")
    
    try:
        from fastapi.middleware.cors import CORSMiddleware
        print("✅ fastapi.middleware.cors.CORSMiddleware - OK")
    except ImportError as e:
        print(f"❌ fastapi.middleware.cors.CORSMiddleware - FAILED: {e}")
    
    print("\nTesting other critical imports...")
    
    try:
        import sqlite3
        print("✅ sqlite3 - OK")
    except ImportError as e:
        print(f"❌ sqlite3 - FAILED: {e}")
    
    try:
        import uvicorn
        print("✅ uvicorn - OK")
    except ImportError as e:
        print(f"❌ uvicorn - FAILED: {e}")
    
    try:
        import websockets
        print("✅ websockets - OK")
    except ImportError as e:
        print(f"❌ websockets - FAILED: {e}")
    
    print("\n✅ Import test completed!")

if __name__ == "__main__":
    test_imports() 