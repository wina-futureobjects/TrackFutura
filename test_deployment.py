#!/usr/bin/env python3
"""
Test script to verify Track-Futura deployment readiness
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return success status"""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def check_file_exists(file_path):
    """Check if a file exists"""
    return Path(file_path).exists()

def main():
    print("🔍 Testing Track-Futura deployment readiness...")
    print("=" * 50)
    
    # Check project structure
    print("\n📁 Checking project structure...")
    required_files = [
        ".upsun/config.yaml",
        "backend/manage.py",
        "backend/requirements.txt",
        "backend/config/settings.py",
        "backend/config/settings_production.py",
        "frontend/package.json",
        "frontend/dist/index.html"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not check_file_exists(file_path):
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"\n❌ Missing files: {missing_files}")
        return False
    
    # Check backend
    print("\n🐍 Checking backend...")
    os.chdir("backend")
    
    # Check Django
    success, stdout, stderr = run_command("python manage.py check")
    if success:
        print("✅ Django check passed")
    else:
        print(f"❌ Django check failed: {stderr}")
        return False
    
    # Check migrations
    success, stdout, stderr = run_command("python manage.py showmigrations --plan")
    if success:
        print("✅ Migrations check passed")
    else:
        print(f"❌ Migrations check failed: {stderr}")
        return False
    
    # Check static files
    success, stdout, stderr = run_command("python manage.py collectstatic --noinput --dry-run")
    if success:
        print("✅ Static files check passed")
    else:
        print(f"❌ Static files check failed: {stderr}")
        return False
    
    os.chdir("..")
    
    # Check frontend
    print("\n⚛️  Checking frontend...")
    os.chdir("frontend")
    
    # Check if dist exists
    if check_file_exists("dist/index.html"):
        print("✅ Frontend build exists")
    else:
        print("❌ Frontend build missing - run 'npm run build' first")
        return False
    
    # Check package.json
    if check_file_exists("package.json"):
        print("✅ package.json exists")
    else:
        print("❌ package.json missing")
        return False
    
    os.chdir("..")
    
    # Check Upsun config
    print("\n☁️  Checking Upsun configuration...")
    if check_file_exists(".upsun/config.yaml"):
        print("✅ Upsun config exists")
    else:
        print("❌ Upsun config missing")
        return False
    
    print("\n🎉 All checks passed! Ready for deployment.")
    print("\nNext steps:")
    print("1. Make sure Upsun CLI is installed: curl -fsS https://cli.upsun.com/installer | php")
    print("2. Login to Upsun: upsun auth:login")
    print("3. Deploy: upsun push")
    print("4. Or use the deployment script: ./deploy.sh")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
