#!/usr/bin/env python3
"""
Validate Upsun configuration files
"""

import os
import yaml
from pathlib import Path

def validate_yaml_file(file_path):
    """Validate a YAML file"""
    try:
        with open(file_path, 'r') as f:
            yaml.safe_load(f)
        return True, "Valid YAML"
    except Exception as e:
        return False, str(e)

def main():
    print("🔍 Validating Upsun configuration...")
    print("=" * 40)
    
    # Check required files
    required_files = [
        ".platform/app.yaml",
        ".platform/frontend-app.yaml", 
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
    
    # Validate YAML files
    print("\n📋 Validating YAML files...")
    for file_path in required_files:
        is_valid, message = validate_yaml_file(file_path)
        if is_valid:
            print(f"✅ {file_path} - {message}")
        else:
            print(f"❌ {file_path} - {message}")
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
    
    # Check frontend build
    if Path("frontend/dist/index.html").exists():
        print("✅ Frontend build exists")
    else:
        print("❌ Frontend build missing - run 'npm run build' first")
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
