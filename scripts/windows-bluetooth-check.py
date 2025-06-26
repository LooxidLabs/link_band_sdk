#!/usr/bin/env python3
"""
Windows Bluetooth Diagnostic Tool for Link Band SDK
This script checks Bluetooth adapter status, services, and permissions on Windows
"""
import sys
import subprocess
import platform
import asyncio
from pathlib import Path

def check_windows_version():
    """Check Windows version compatibility"""
    print("=== Windows Version Check ===")
    version = platform.version()
    release = platform.release()
    print(f"Windows Version: {release} ({version})")
    
    # Windows 10 version 1903 (build 18362) or later required for good BLE support
    if release == "10":
        try:
            build = int(version.split('.')[-1])
            if build >= 18362:
                print("✓ Windows version supports BLE (build 18362+)")
                return True
            else:
                print(f"⚠ Warning: Windows build {build} may have limited BLE support")
                print("  Recommended: Windows 10 build 18362+ or Windows 11")
                return False
        except:
            print("⚠ Could not determine Windows build number")
            return False
    elif release == "11":
        print("✓ Windows 11 has excellent BLE support")
        return True
    else:
        print(f"⚠ Unsupported Windows version: {release}")
        return False

def check_bluetooth_service():
    """Check if Windows Bluetooth service is running"""
    print("\n=== Bluetooth Service Check ===")
    try:
        # Check Bluetooth Support Service
        result = subprocess.run([
            'sc', 'query', 'bthserv'
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode == 0:
            if "RUNNING" in result.stdout:
                print("✓ Bluetooth Support Service is running")
                return True
            else:
                print("❌ Bluetooth Support Service is not running")
                print("  Try: net start bthserv")
                return False
        else:
            print("❌ Bluetooth Support Service not found")
            return False
    except Exception as e:
        print(f"❌ Error checking Bluetooth service: {e}")
        return False

def check_bluetooth_adapter():
    """Check Bluetooth adapter using PowerShell"""
    print("\n=== Bluetooth Adapter Check ===")
    try:
        # Get Bluetooth adapter info using PowerShell
        ps_command = """
        Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq 'OK'} | 
        Select-Object FriendlyName, Status, InstanceId
        """
        
        result = subprocess.run([
            'powershell', '-Command', ps_command
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode == 0 and result.stdout.strip():
            print("✓ Bluetooth adapters found:")
            print(result.stdout)
            return True
        else:
            print("❌ No working Bluetooth adapters found")
            print("  Check Device Manager for Bluetooth adapter issues")
            return False
    except Exception as e:
        print(f"❌ Error checking Bluetooth adapter: {e}")
        return False

def check_python_bluetooth_access():
    """Check if Python can access Bluetooth"""
    print("\n=== Python Bluetooth Access Check ===")
    try:
        import bleak
        print(f"✓ Bleak library version: {bleak.__version__}")
        
        # Try to create a BleakScanner
        from bleak import BleakScanner
        scanner = BleakScanner()
        print("✓ BleakScanner created successfully")
        return True
    except ImportError as e:
        print(f"❌ Bleak library not installed: {e}")
        print("  Install with: pip install bleak")
        return False
    except Exception as e:
        print(f"❌ Error accessing Bluetooth through Python: {e}")
        return False

async def test_bluetooth_scan():
    """Test actual Bluetooth scanning"""
    print("\n=== Bluetooth Scan Test ===")
    try:
        from bleak import BleakScanner
        
        print("Starting 10-second BLE scan...")
        devices = await BleakScanner.discover(timeout=10.0)
        
        if devices:
            print(f"✓ Found {len(devices)} BLE devices:")
            for device in devices:
                print(f"  - {device.name or 'Unknown'} ({device.address})")
            return True
        else:
            print("⚠ No BLE devices found during scan")
            print("  This could mean:")
            print("  1. No BLE devices are nearby")
            print("  2. Bluetooth permissions are not granted")
            print("  3. BLE devices are not advertising")
            return False
    except Exception as e:
        print(f"❌ Error during Bluetooth scan: {e}")
        print("  This usually indicates a permission or driver issue")
        return False

def check_windows_privacy_settings():
    """Check Windows privacy settings for Bluetooth"""
    print("\n=== Windows Privacy Settings Check ===")
    print("Please manually check the following Windows settings:")
    print("1. Open Windows Settings (Win + I)")
    print("2. Go to Privacy & Security > App permissions > Bluetooth")
    print("3. Make sure 'Let apps access Bluetooth' is ON")
    print("4. Make sure 'Let desktop apps access Bluetooth' is ON")
    print("5. If using Python from Microsoft Store, ensure it has Bluetooth permission")
    print("\nAlternatively, you can check by running:")
    print("  ms-settings:privacy-radios")

def print_troubleshooting_steps():
    """Print troubleshooting steps"""
    print("\n" + "="*60)
    print("TROUBLESHOOTING STEPS")
    print("="*60)
    print("If Bluetooth scan failed, try these steps:")
    print()
    print("1. RESTART BLUETOOTH:")
    print("   - Open Device Manager")
    print("   - Find Bluetooth adapter under 'Bluetooth'")
    print("   - Right-click > Disable, then Enable")
    print()
    print("2. RUN AS ADMINISTRATOR:")
    print("   - Close the application")
    print("   - Right-click on Command Prompt > 'Run as administrator'")
    print("   - Navigate to project folder and run again")
    print()
    print("3. CHECK WINDOWS BLUETOOTH SETTINGS:")
    print("   - Settings > Devices > Bluetooth & other devices")
    print("   - Make sure Bluetooth is ON")
    print("   - Try removing and re-adding Bluetooth devices")
    print()
    print("4. UPDATE BLUETOOTH DRIVERS:")
    print("   - Device Manager > Bluetooth")
    print("   - Right-click adapter > Update driver")
    print()
    print("5. RESTART BLUETOOTH SERVICE:")
    print("   - Open Services (services.msc)")
    print("   - Find 'Bluetooth Support Service'")
    print("   - Right-click > Restart")

async def main():
    """Main diagnostic function"""
    print("Windows Bluetooth Diagnostic Tool for Link Band SDK")
    print("="*60)
    
    if platform.system() != "Windows":
        print("❌ This tool is designed for Windows only")
        print(f"Current OS: {platform.system()}")
        return
    
    # Run all checks
    checks = []
    checks.append(check_windows_version())
    checks.append(check_bluetooth_service())
    checks.append(check_bluetooth_adapter())
    checks.append(check_python_bluetooth_access())
    
    # Only run scan test if basic checks pass
    if all(checks):
        scan_result = await test_bluetooth_scan()
        checks.append(scan_result)
    
    check_windows_privacy_settings()
    
    # Summary
    print("\n" + "="*60)
    print("DIAGNOSTIC SUMMARY")
    print("="*60)
    
    if all(checks):
        print("✓ All checks passed! Bluetooth should work.")
        print("If you're still having issues, the Link Band device might:")
        print("  - Be out of range")
        print("  - Not be in pairing/advertising mode")
        print("  - Have a low battery")
    else:
        print("❌ Some checks failed. Please review the issues above.")
        print_troubleshooting_steps()

if __name__ == "__main__":
    if platform.system() == "Windows":
        asyncio.run(main())
    else:
        print("This diagnostic tool is for Windows only.")
        print(f"Current OS: {platform.system()}") 