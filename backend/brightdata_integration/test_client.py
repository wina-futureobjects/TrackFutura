"""
Test client for Brightdata Integration API.

Usage:
1. First, create a configuration:
   python test_client.py --create-config --name "My Config" --api-token "your_api_token" --dataset-id "your_dataset_id"

2. Then, trigger a scrape:
   python test_client.py --trigger-scrape --url "https://www.facebook.com/LeBron/"

3. Check status of a scraper request:
   python test_client.py --check-request --request-id 123
"""

import requests
import argparse
import json
from datetime import datetime

# Base URL for the API - change as needed
BASE_URL = "http://localhost:8000/api/brightdata"

def create_config(name, api_token, dataset_id):
    """Create a new Brightdata API configuration"""
    url = f"{BASE_URL}/configs/"
    data = {
        "name": name,
        "api_token": api_token,
        "dataset_id": dataset_id,
        "is_active": True
    }
    
    response = requests.post(url, json=data)
    print(f"Status code: {response.status_code}")
    
    if response.status_code in (200, 201):
        print(f"Configuration created successfully: {response.json()}")
    else:
        print(f"Error creating configuration: {response.text}")

def get_configs():
    """Get all configurations"""
    url = f"{BASE_URL}/configs/"
    response = requests.get(url)
    
    if response.status_code == 200:
        configs = response.json()
        if configs:
            print(f"Found {len(configs)} configurations:")
            for config in configs:
                print(f"- ID: {config['id']}, Name: {config['name']}, Active: {config['is_active']}")
        else:
            print("No configurations found")
    else:
        print(f"Error getting configurations: {response.text}")

def set_active_config(config_id):
    """Set a configuration as active"""
    url = f"{BASE_URL}/configs/{config_id}/set_active/"
    response = requests.post(url)
    
    if response.status_code == 200:
        print(f"Configuration {config_id} set as active")
    else:
        print(f"Error setting configuration as active: {response.text}")

def trigger_scrape(url, num_posts=10, content_type="post", folder_id=None, start_date=None, end_date=None):
    """Trigger a Facebook scrape"""
    api_url = f"{BASE_URL}/requests/trigger_facebook_scrape/"
    
    data = {
        "target_url": url,
        "content_type": content_type,
        "num_of_posts": num_posts
    }
    
    # Add optional parameters if provided
    if folder_id:
        data["folder_id"] = folder_id
    
    if start_date:
        data["start_date"] = start_date
    
    if end_date:
        data["end_date"] = end_date
    
    response = requests.post(api_url, json=data)
    
    if response.status_code == 200:
        response_data = response.json()
        print(f"Scrape triggered successfully")
        print(f"Request ID: {response_data['request_id']}")
        print(f"Status: {response_data['status']}")
    else:
        print(f"Error triggering scrape: {response.text}")

def check_request(request_id=None):
    """Check status of a specific request or list all requests"""
    if request_id:
        url = f"{BASE_URL}/requests/{request_id}/"
        response = requests.get(url)
        
        if response.status_code == 200:
            request_data = response.json()
            print(f"Request ID: {request_data['id']}")
            print(f"Status: {request_data['status']}")
            print(f"Platform: {request_data['platform']}")
            print(f"URL: {request_data['target_url']}")
            print(f"Created: {request_data['created_at']}")
            print(f"Completed: {request_data['completed_at'] or 'Not completed yet'}")
            
            if request_data['error_message']:
                print(f"Error: {request_data['error_message']}")
        else:
            print(f"Error getting request: {response.text}")
    else:
        url = f"{BASE_URL}/requests/"
        response = requests.get(url)
        
        if response.status_code == 200:
            requests_data = response.json()
            if requests_data:
                print(f"Found {len(requests_data)} requests:")
                for req in requests_data:
                    print(f"- ID: {req['id']}, URL: {req['target_url']}, Status: {req['status']}")
            else:
                print("No requests found")
        else:
            print(f"Error listing requests: {response.text}")

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Brightdata API Client")
    
    # Config management
    parser.add_argument('--create-config', action='store_true', help='Create a new configuration')
    parser.add_argument('--list-configs', action='store_true', help='List all configurations')
    parser.add_argument('--set-active', type=int, help='Set a configuration as active by ID')
    parser.add_argument('--name', help='Configuration name')
    parser.add_argument('--api-token', help='Brightdata API token')
    parser.add_argument('--dataset-id', help='Brightdata dataset ID')
    
    # Scraping
    parser.add_argument('--trigger-scrape', action='store_true', help='Trigger a Facebook scrape')
    parser.add_argument('--url', help='URL to scrape')
    parser.add_argument('--num-posts', type=int, default=10, help='Number of posts to scrape')
    parser.add_argument('--content-type', choices=['post', 'reel'], default='post', help='Content type to scrape')
    parser.add_argument('--folder-id', type=int, help='Folder ID to store scraped data')
    parser.add_argument('--start-date', help='Start date for posts (format: MM-DD-YYYY)')
    parser.add_argument('--end-date', help='End date for posts (format: MM-DD-YYYY)')
    
    # Request management
    parser.add_argument('--check-request', action='store_true', help='Check status of a scraper request')
    parser.add_argument('--request-id', type=int, help='Request ID to check')
    
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Config management
    if args.create_config:
        if not all([args.name, args.api_token, args.dataset_id]):
            print("Error: --name, --api-token, and --dataset-id are required for --create-config")
            return
        create_config(args.name, args.api_token, args.dataset_id)
    
    elif args.list_configs:
        get_configs()
    
    elif args.set_active:
        set_active_config(args.set_active)
    
    # Scraping
    elif args.trigger_scrape:
        if not args.url:
            print("Error: --url is required for --trigger-scrape")
            return
        trigger_scrape(
            args.url,
            args.num_posts,
            args.content_type,
            args.folder_id,
            args.start_date,
            args.end_date
        )
    
    # Request management
    elif args.check_request:
        check_request(args.request_id)
    
    else:
        print("No action specified. Use --help to see available options.")

if __name__ == "__main__":
    main() 