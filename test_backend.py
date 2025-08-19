#!/usr/bin/env python3
"""
Test script for ZClipper Backend
Tests the viral detection and clip creation functionality
"""

import asyncio
import sys
import os

# Add the clip-repurpose-engine to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '../clip-repurpose-engine'))

async def test_viral_detection():
    """Test the viral detection functionality"""
    print("🧪 Testing Viral Detection...")
    
    try:
        from final_working_clipper import WorkingViralDetector, WorkingViralClipper
        
        # Test detector creation
        detector = WorkingViralDetector("test_channel")
        print("✅ WorkingViralDetector created successfully")
        
        # Test clipper creation
        clipper = WorkingViralClipper("test_channel")
        print("✅ WorkingViralClipper created successfully")
        
        # Test stream capture
        print("🎥 Testing stream capture...")
        has_stream = clipper.capture.get_stream_url()
        print(f"   Stream available: {has_stream}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def test_backend_imports():
    """Test that the backend can import all required modules"""
    print("🧪 Testing Backend Imports...")
    
    try:
        import backend_server
        print("✅ Backend server imports successful")
        
        # Test that the classes are available
        from backend_server import SimpleViralDetector, SimpleClipper, ViralSession
        print("✅ Backend classes imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Backend import test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 ZClipper Backend Test Suite")
    print("=" * 40)
    
    tests = [
        ("Backend Imports", test_backend_imports),
        ("Viral Detection", test_viral_detection),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
            print(f"   {'✅ PASSED' if result else '❌ FAILED'}")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 40)
    print("📊 Test Results:")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is ready to use.")
        return True
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

