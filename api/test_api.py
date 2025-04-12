#!/usr/bin/env python3
"""
Test script for the Flask API endpoints
This script tests the basic functionality of all API endpoints
"""

import requests
import json
import sys
import os
from pathlib import Path

# Base URL for API requests
API_BASE_URL = 'http://localhost:5000/api'

def test_locations_api():
    """Test the locations API endpoints"""
    print("\n=== Testing Locations API ===")
    
    # Test GET /locations
    print("Testing GET /locations...")
    response = requests.get(f"{API_BASE_URL}/locations")
    if response.status_code == 200:
        locations = response.json()
        print(f"Success! Found {len(locations)} locations.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test POST /locations
    print("\nTesting POST /locations...")
    test_data = {
        'name': 'Test Location',
        'description': 'This is a test location'
    }
    files = {}
    
    response = requests.post(f"{API_BASE_URL}/locations", data=test_data, files=files)
    if response.status_code == 201:
        new_location = response.json()
        print(f"Success! Created location: {new_location['name']} (ID: {new_location['id']})")
        location_id = new_location['id']
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test GET /locations/{id}
    print(f"\nTesting GET /locations/{location_id}...")
    response = requests.get(f"{API_BASE_URL}/locations/{location_id}")
    if response.status_code == 200:
        location = response.json()
        print(f"Success! Retrieved location: {location['name']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test PUT /locations/{id}
    print(f"\nTesting PUT /locations/{location_id}...")
    update_data = {
        'name': 'Updated Test Location',
        'description': 'This location has been updated'
    }
    
    response = requests.put(f"{API_BASE_URL}/locations/{location_id}", data=update_data, files={})
    if response.status_code == 200:
        updated_location = response.json()
        print(f"Success! Updated location: {updated_location['name']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    return location_id

def test_regions_api(location_id):
    """Test the regions API endpoints"""
    print("\n=== Testing Regions API ===")
    
    # Test GET /locations/{id}/regions
    print(f"Testing GET /locations/{location_id}/regions...")
    response = requests.get(f"{API_BASE_URL}/locations/{location_id}/regions")
    if response.status_code == 200:
        regions = response.json()
        print(f"Success! Found {len(regions)} regions.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test POST /locations/{id}/regions
    print(f"\nTesting POST /locations/{location_id}/regions...")
    region_data = {
        'name': 'Test Region',
        'x': 10,
        'y': 10,
        'width': 100,
        'height': 100
    }
    
    response = requests.post(
        f"{API_BASE_URL}/locations/{location_id}/regions", 
        json=region_data
    )
    if response.status_code == 201:
        new_region = response.json()
        print(f"Success! Created region: {new_region['name']} (ID: {new_region['id']})")
        region_id = new_region['id']
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    return region_id

def test_inventory_api(location_id, region_id):
    """Test the inventory API endpoints"""
    print("\n=== Testing Inventory API ===")
    
    # Test GET /inventory
    print("Testing GET /inventory...")
    response = requests.get(f"{API_BASE_URL}/inventory")
    if response.status_code == 200:
        items = response.json()
        print(f"Success! Found {len(items)} inventory items.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test POST /inventory
    print("\nTesting POST /inventory...")
    item_data = {
        'name': 'Test Item',
        'description': 'This is a test item',
        'quantity': '2',
        'locationId': str(location_id),
        'regionId': str(region_id)
    }
    files = {}
    
    response = requests.post(f"{API_BASE_URL}/inventory", data=item_data, files=files)
    if response.status_code == 201:
        new_item = response.json()
        print(f"Success! Created item: {new_item['name']} (ID: {new_item['id']})")
        item_id = new_item['id']
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test GET /inventory/{id}
    print(f"\nTesting GET /inventory/{item_id}...")
    response = requests.get(f"{API_BASE_URL}/inventory/{item_id}")
    if response.status_code == 200:
        item = response.json()
        print(f"Success! Retrieved item: {item['name']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    # Test GET /inventory?locationId={location_id}
    print(f"\nTesting GET /inventory?locationId={location_id}...")
    response = requests.get(f"{API_BASE_URL}/inventory?locationId={location_id}")
    if response.status_code == 200:
        items = response.json()
        print(f"Success! Found {len(items)} items in location {location_id}.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    return item_id

def test_search_api(query="Test"):
    """Test the search API endpoint"""
    print("\n=== Testing Search API ===")
    
    # Test GET /search?q={query}
    print(f"Testing GET /search?q={query}...")
    response = requests.get(f"{API_BASE_URL}/search?q={query}")
    if response.status_code == 200:
        results = response.json()
        print(f"Success! Found {len(results)} results for query '{query}'.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    return True

def test_led_api(item_id):
    """Test the LED API endpoint"""
    print("\n=== Testing LED API ===")
    
    # Test GET /led/{id}
    print(f"Testing GET /led/{item_id}...")
    response = requests.get(f"{API_BASE_URL}/led/{item_id}")
    if response.status_code == 200:
        led_data = response.json()
        print(f"Success! Retrieved LED data for item {item_id}.")
        print(f"LED Position: x={led_data['ledPosition']['x']}, y={led_data['ledPosition']['y']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False
    
    return True

def cleanup(location_id, item_id):
    """Clean up test data"""
    print("\n=== Cleaning Up Test Data ===")
    
    # Delete test item
    print(f"Deleting test item {item_id}...")
    response = requests.delete(f"{API_BASE_URL}/inventory/{item_id}")
    if response.status_code == 200:
        print("Success! Deleted test item.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    # Delete test location
    print(f"Deleting test location {location_id}...")
    response = requests.delete(f"{API_BASE_URL}/locations/{location_id}")
    if response.status_code == 200:
        print("Success! Deleted test location.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

def main():
    """Main function to run all tests"""
    print("Starting API tests...\n")
    
    # Test locations API
    location_id = test_locations_api()
    if not location_id:
        print("Locations API tests failed. Exiting.")
        return
    
    # Test regions API
    region_id = test_regions_api(location_id)
    if not region_id:
        print("Regions API tests failed. Exiting.")
        return
    
    # Test inventory API
    item_id = test_inventory_api(location_id, region_id)
    if not item_id:
        print("Inventory API tests failed. Exiting.")
        return
    
    # Test search API
    if not test_search_api():
        print("Search API tests failed. Exiting.")
        return
    
    # Test LED API
    if not test_led_api(item_id):
        print("LED API tests failed. Exiting.")
        return
    
    # Clean up test data
    cleanup(location_id, item_id)
    
    print("\nAll API tests completed successfully!")

if __name__ == "__main__":
    main()
