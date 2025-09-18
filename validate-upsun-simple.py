#!/usr/bin/env python3
"""
Simple validation for Upsun configuration files
"""

import os
from pathlib import Path

def main():
    print("🔍 Validating Upsun configuration...")
    print("=" * 40)
    
    # Check required files
    required_files = [
        ".platform/app.yaml",
        ".platform/routes.yaml",
        ".platform/services.yaml"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path} exists")
    
    if missing_files:
        print(f"\n❌ Missing files: {missing_files}")
        return False
    
    # Check project structure
    print("\n📁 Checking project structure...")
    required_dirs = ["backend", "frontend"]
    for dir_name in required_dirs:
        if Path(dir_name).exists():
            print(f"✅ {dir_name}/ directory exists")
        else:
            print(f"❌ {dir_name}/ directory missing")
            return False
    
    # Check frontend build and public folder
    if Path("frontend/dist/index.html").exists():
        print("✅ Frontend build exists")
    else:
        print("❌ Frontend build missing - run 'npm run build' first")
        return False
    
    if Path("public/index.html").exists():
        print("✅ Public folder with frontend files exists")
    else:
        print("❌ Public folder missing - frontend files not copied")
        return False
    
    # Check backend files
    backend_files = [
        "backend/manage.py",
        "backend/requirements.txt",
        "backend/config/settings.py",
        "backend/config/settings_production.py"
    ]
    
    print("\n🐍 Checking backend files...")
    for file_path in backend_files:
        if Path(file_path).exists():
            print(f"✅ {file_path} exists")
        else:
            print(f"❌ {file_path} missing")
            return False
    
    print("\n🎉 All Upsun configuration files are valid!")
    print("\nReady for deployment with:")
    print("  upsun push")
    print("  or")
    print("  .\\deploy-upsun.ps1")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
