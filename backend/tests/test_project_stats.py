#!/usr/bin/env python3
"""
Test script for project statistics API endpoint
"""
import requests
import json

def test_project_stats_api():
    """Test the project statistics API endpoint"""
    
    # Test URL
    url = "http://localhost:8000/api/users/projects/1/stats/"
    
    try:
        # Make the request
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Connection Error: Make sure the Django server is running on port 8000")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_project_stats_api() 