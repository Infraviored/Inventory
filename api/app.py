from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
from werkzeug.utils import secure_filename
from pathlib import Path
from database import (
    init_db, get_locations, get_location_by_id, add_location, update_location, delete_location,
    get_location_regions, get_region_by_id, add_location_region, update_location_region, delete_location_region,
    get_inventory_items, get_inventory_item_by_id, add_inventory_item, update_inventory_item, delete_inventory_item,
    search_items, get_location_breadcrumbs
)

# Initialize Flask app
app = Flask(__name__, static_folder='../public')
CORS(app)  # Enable CORS for all routes

# Ensure uploads directory exists
UPLOADS_DIR = Path('../public/uploads')
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Initialize database
init_db()

# Helper function to generate unique filenames
def generate_unique_filename(original_filename):
    """Generate a unique filename by adding a UUID"""
    filename, ext = os.path.splitext(original_filename)
    return f"{filename}_{uuid.uuid4().hex}{ext}"

# Serve static files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('../public/uploads', filename)

# Location routes
@app.route('/api/locations', methods=['GET'])
def get_locations_route():
    try:
        parent_id = request.args.get('parentId')
        is_root = request.args.get('root')
        
        if parent_id:
            locations = get_locations(parent_id=int(parent_id))
        elif is_root == 'true':
            locations = get_locations(root_only=True)
        else:
            locations = get_locations()
        
        # Transform the data to include full image paths
        transformed_locations = []
        for location in locations:
            transformed_locations.append({
                'id': location['id'],
                'name': location['name'],
                'description': location['description'],
                'parentId': location['parent_id'],
                'imagePath': f"/uploads/{location['image_path']}" if location['image_path'] else None,
                'createdAt': location['created_at'],
                'updatedAt': location['updated_at']
            })
        
        return jsonify(transformed_locations)
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return jsonify({"error": "Failed to fetch locations"}), 500

@app.route('/api/locations', methods=['POST'])
def add_location_route():
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        parent_id_str = request.form.get('parentId')
        parent_id = int(parent_id_str) if parent_id_str else None
        
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename:
                filename = generate_unique_filename(secure_filename(image.filename))
                image_path = filename
                image.save(UPLOADS_DIR / filename)
        
        location_id = add_location(name, parent_id, description, image_path)
        
        new_location = get_location_by_id(location_id)
        
        return jsonify({
            'id': new_location['id'],
            'name': new_location['name'],
            'description': new_location['description'],
            'parentId': new_location['parent_id'],
            'imagePath': f"/uploads/{new_location['image_path']}" if new_location['image_path'] else None,
            'createdAt': new_location['created_at'],
            'updatedAt': new_location['updated_at']
        }), 201
    except Exception as e:
        print(f"Error creating location: {e}")
        return jsonify({"error": "Failed to create location"}), 500

@app.route('/api/locations/<int:location_id>', methods=['GET'])
def get_location_route(location_id):
    try:
        location = get_location_by_id(location_id)
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        return jsonify({
            'id': location['id'],
            'name': location['name'],
            'description': location['description'],
            'parentId': location['parent_id'],
            'imagePath': f"/uploads/{location['image_path']}" if location['image_path'] else None,
            'createdAt': location['created_at'],
            'updatedAt': location['updated_at']
        })
    except Exception as e:
        print(f"Error fetching location: {e}")
        return jsonify({"error": "Failed to fetch location"}), 500

@app.route('/api/locations/<int:location_id>', methods=['PUT'])
def update_location_route(location_id):
    try:
        location = get_location_by_id(location_id)
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        name = request.form.get('name')
        description = request.form.get('description')
        parent_id_str = request.form.get('parentId')
        parent_id = int(parent_id_str) if parent_id_str else None
        
        image_path = location['image_path']
        if 'image' in request.files:
            image = request.files['image']
            if image.filename:
                # Delete old image if it exists
                if image_path and os.path.exists(UPLOADS_DIR / image_path):
                    os.remove(UPLOADS_DIR / image_path)
                
                filename = generate_unique_filename(secure_filename(image.filename))
                image_path = filename
                image.save(UPLOADS_DIR / filename)
        
        update_location(location_id, name, parent_id, description, image_path)
        
        updated_location = get_location_by_id(location_id)
        
        return jsonify({
            'id': updated_location['id'],
            'name': updated_location['name'],
            'description': updated_location['description'],
            'parentId': updated_location['parent_id'],
            'imagePath': f"/uploads/{updated_location['image_path']}" if updated_location['image_path'] else None,
            'createdAt': updated_location['created_at'],
            'updatedAt': updated_location['updated_at']
        })
    except Exception as e:
        print(f"Error updating location: {e}")
        return jsonify({"error": "Failed to update location"}), 500

@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location_route(location_id):
    try:
        location = get_location_by_id(location_id)
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        # Delete associated image if it exists
        if location['image_path'] and os.path.exists(UPLOADS_DIR / location['image_path']):
            os.remove(UPLOADS_DIR / location['image_path'])
        
        delete_location(location_id)
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting location: {e}")
        return jsonify({"error": "Failed to delete location"}), 500

@app.route('/api/locations/<int:location_id>/breadcrumbs', methods=['GET'])
def get_breadcrumbs_route(location_id):
    try:
        breadcrumbs = get_location_breadcrumbs(location_id)
        
        if not breadcrumbs:
            return jsonify({"error": "Location not found"}), 404
        
        # Transform the data
        transformed_breadcrumbs = []
        for location in breadcrumbs:
            transformed_breadcrumbs.append({
                'id': location['id'],
                'name': location['name']
            })
        
        return jsonify(transformed_breadcrumbs)
    except Exception as e:
        print(f"Error fetching breadcrumbs: {e}")
        return jsonify({"error": "Failed to fetch breadcrumbs"}), 500

# Region routes
@app.route('/api/locations/<int:location_id>/regions', methods=['GET'])
def get_regions_route(location_id):
    try:
        regions = get_location_regions(location_id)
        
        # Transform the data
        transformed_regions = []
        for region in regions:
            transformed_regions.append({
                'id': region['id'],
                'locationId': region['location_id'],
                'name': region['name'],
                'x': region['x_coord'],
                'y': region['y_coord'],
                'width': region['width'],
                'height': region['height']
            })
        
        return jsonify(transformed_regions)
    except Exception as e:
        print(f"Error fetching regions: {e}")
        return jsonify({"error": "Failed to fetch regions"}), 500

@app.route('/api/locations/<int:location_id>/regions', methods=['POST'])
def add_region_route(location_id):
    try:
        print(f"Received region POST request for location {location_id}")
        
        # Check if location exists
        location = get_location_by_id(location_id)
        if not location:
            print(f"Error: Location with ID {location_id} not found")
            return jsonify({"error": f"Location with ID {location_id} not found"}), 404
        
        # Get region data from request
        if request.is_json:
            data = request.json
            print(f"Received JSON data: {data}")
        else:
            print("Error: Request must be JSON")
            return jsonify({"error": "Request must be JSON"}), 400
        
        # Validate required fields
        required_fields = ['name', 'x', 'y', 'width', 'height']
        for field in required_fields:
            if field not in data:
                print(f"Error: Missing required field '{field}'")
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Extract values
        name = data['name']
        x = data['x']
        y = data['y']
        width = data['width']
        height = data['height']
        
        # Add region to database
        try:
            region_id = add_location_region(location_id, name, x, y, width, height)
            print(f"Region created successfully with ID: {region_id}")
        except Exception as dbErr:
            print(f"Database error adding region: {dbErr}")
            return jsonify({"error": f"Database error: {str(dbErr)}"}), 500
        
        # Get newly created region
        new_region = get_region_by_id(region_id)
        if not new_region:
            print(f"Error: Failed to retrieve newly created region with ID {region_id}")
            return jsonify({"error": "Region was created but could not be retrieved"}), 500
        
        # Return the region
        response = {
            'id': new_region['id'],
            'locationId': new_region['location_id'],
            'name': new_region['name'],
            'x': new_region['x_coord'],
            'y': new_region['y_coord'],
            'width': new_region['width'],
            'height': new_region['height'],
            'createdAt': new_region['created_at'],
            'updatedAt': new_region['updated_at']
        }
        
        print(f"Returning newly created region: {response}")
        return jsonify(response), 201
    except Exception as e:
        print(f"Unhandled error creating region: {e}")
        return jsonify({"error": f"Failed to create region: {str(e)}"}), 500

# Inventory routes
@app.route('/api/inventory', methods=['GET'])
def get_inventory_route():
    try:
        location_id = request.args.get('locationId')
        region_id = request.args.get('regionId')
        
        if location_id:
            location_id = int(location_id)
        
        if region_id:
            region_id = int(region_id)
        
        items = get_inventory_items(location_id, region_id)
        
        # Transform the data
        transformed_items = []
        for item in items:
            transformed_items.append({
                'id': item['id'],
                'name': item['name'],
                'description': item['description'],
                'quantity': item['quantity'],
                'imagePath': f"/uploads/{item['image_path']}" if item['image_path'] else None,
                'locationId': item['location_id'],
                'locationName': item['location_name'],
                'regionId': item['region_id'],
                'regionName': item['region_name'],
                'createdAt': item['created_at'],
                'updatedAt': item['updated_at']
            })
        
        return jsonify(transformed_items)
    except Exception as e:
        print(f"Error fetching inventory items: {e}")
        return jsonify({"error": "Failed to fetch inventory items"}), 500

@app.route('/api/inventory', methods=['POST'])
def add_inventory_route():
    try:
        print("Received inventory POST request")
        
        # Validate that required fields are present
        if 'name' not in request.form:
            print("Error: Missing required field: name")
            return jsonify({"error": "Missing required field: name"}), 400
        
        name = request.form.get('name')
        description = request.form.get('description')
        quantityStr = request.form.get('quantity')
        quantity = int(quantityStr) if quantityStr else 1
        locationIdStr = request.form.get('locationId')
        locationId = int(locationIdStr) if locationIdStr else None
        regionIdStr = request.form.get('regionId')
        regionId = int(regionIdStr) if regionIdStr else None
        
        # Validate location existence if provided
        if locationId is not None:
            location = get_location_by_id(locationId)
            if not location:
                print(f"Error: Location with ID {locationId} not found")
                return jsonify({"error": f"Location with ID {locationId} not found"}), 404
        
        # Validate region existence if provided
        if regionId is not None:
            region = get_region_by_id(regionId)
            if not region:
                print(f"Error: Region with ID {regionId} not found")
                return jsonify({"error": f"Region with ID {regionId} not found"}), 404
        
        imagePath = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename:
                try:
                    filename = generate_unique_filename(secure_filename(image.filename))
                    imagePath = filename
                    image.save(UPLOADS_DIR / filename)
                except Exception as imgErr:
                    print(f"Error saving image: {imgErr}")
                    return jsonify({"error": f"Error saving image: {str(imgErr)}"}), 500
        
        # Add the item to the database
        try:
            itemId = add_inventory_item(
                name, 
                description or None, 
                quantity, 
                imagePath, 
                locationId, 
                regionId
            )
            print(f"Item created successfully with ID: {itemId}")
        except Exception as dbErr:
            print(f"Database error adding item: {dbErr}")
            return jsonify({"error": f"Database error: {str(dbErr)}"}), 500
        
        # Get the newly created item
        newItem = get_inventory_item_by_id(itemId)
        if not newItem:
            print(f"Error: Failed to retrieve newly created item with ID {itemId}")
            return jsonify({"error": "Item was created but could not be retrieved"}), 500
        
        # Return the item with proper JSON formatting
        response = {
            'id': newItem['id'],
            'name': newItem['name'],
            'description': newItem['description'],
            'quantity': newItem['quantity'],
            'imagePath': f"/uploads/{newItem['image_path']}" if newItem['image_path'] else None,
            'locationId': newItem['location_id'],
            'locationName': newItem['location_name'],
            'regionId': newItem['region_id'],
            'regionName': newItem['region_name'],
            'createdAt': newItem['created_at'],
            'updatedAt': newItem['updated_at']
        }
        
        print(f"Returning newly created item: {response}")
        return jsonify(response), 201
    except Exception as e:
        print(f"Unhandled error creating inventory item: {e}")
        return jsonify(
            {"error": f"Failed to create inventory item: {str(e)}"}
        ), 500

@app.route('/api/inventory/<int:item_id>', methods=['GET'])
def get_inventory_item_route(item_id):
    try:
        item = get_inventory_item_by_id(item_id)
        
        if not item:
            return jsonify({"error": "Inventory item not found"}), 404
        
        return jsonify({
            'id': item['id'],
            'name': item['name'],
            'description': item['description'],
            'quantity': item['quantity'],
            'imagePath': f"/uploads/{item['image_path']}" if item['image_path'] else None,
            'locationId': item['location_id'],
            'locationName': item['location_name'],
            'regionId': item['region_id'],
            'regionName': item['region_name'],
            'createdAt': item['created_at'],
            'updatedAt': item['updated_at']
        })
    except Exception as e:
        print(f"Error fetching inventory item: {e}")
        return jsonify({"error": "Failed to fetch inventory item"}), 500

@app.route('/api/inventory/<int:item_id>', methods=['PUT'])
def update_inventory_item_route(item_id):
    try:
        item = get_inventory_item_by_id(item_id)
        
        if not item:
            return jsonify({"error": "Inventory item not found"}), 404
        
        name = request.form.get('name')
        description = request.form.get('description')
        quantity_str = request.form.get('quantity')
        quantity = int(quantity_str) if quantity_str else 1
        location_id_str = request.form.get('locationId')
        location_id = int(location_id_str) if location_id_str else None
        region_id_str = request.form.get('regionId')
        region_id = int(region_id_str) if region_id_str else None
        
        image_path = item['image_path']
        if 'image' in request.files:
            image = request.files['image']
            if image.filename:
                # Delete old image if it exists
                if image_path and os.path.exists(UPLOADS_DIR / image_path):
                    os.remove(UPLOADS_DIR / image_path)
                
                filename = generate_unique_filename(secure_filename(image.filename))
                image_path = filename
                image.save(UPLOADS_DIR / filename)
        
        update_inventory_item(item_id, name, description, quantity, image_path, location_id, region_id)
        
        updated_item = get_inventory_item_by_id(item_id)
        
        return jsonify({
            'id': updated_item['id'],
            'name': updated_item['name'],
            'description': updated_item['description'],
            'quantity': updated_item['quantity'],
            'imagePath': f"/uploads/{updated_item['image_path']}" if updated_item['image_path'] else None,
            'locationId': updated_item['location_id'],
            'locationName': updated_item['location_name'],
            'regionId': updated_item['region_id'],
            'regionName': updated_item['region_name'],
            'createdAt': updated_item['created_at'],
            'updatedAt': updated_item['updated_at']
        })
    except Exception as e:
        print(f"Error updating inventory item: {e}")
        return jsonify({"error": "Failed to update inventory item"}), 500

@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
def delete_inventory_item_route(item_id):
    try:
        item = get_inventory_item_by_id(item_id)
        
        if not item:
            return jsonify({"error": "Inventory item not found"}), 404
        
        # Delete associated image if it exists
        if item['image_path'] and os.path.exists(UPLOADS_DIR / item['image_path']):
            os.remove(UPLOADS_DIR / item['image_path'])
        
        delete_inventory_item(item_id)
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting inventory item: {e}")
        return jsonify({"error": "Failed to delete inventory item"}), 500

# Search route
@app.route('/api/search', methods=['GET'])
def search_route():
    try:
        query = request.args.get('q')
        
        if not query:
            return jsonify([])
        
        results = search_items(query)
        
        # Transform the data
        transformed_results = []
        for item in results:
            transformed_results.append({
                'id': item['id'],
                'name': item['name'],
                'description': item['description'],
                'quantity': item['quantity'],
                'imagePath': f"/uploads/{item['image_path']}" if item['image_path'] else None,
                'locationId': item['location_id'],
                'locationName': item['location_name'],
                'regionId': item['region_id'],
                'regionName': item['region_name'],
                'createdAt': item['created_at'],
                'updatedAt': item['updated_at']
            })
        
        return jsonify(transformed_results)
    except Exception as e:
        print(f"Error searching items: {e}")
        return jsonify({"error": "Failed to search items"}), 500

# LED route
@app.route('/api/led/<int:item_id>', methods=['GET'])
def led_route(item_id):
    try:
        item = get_inventory_item_by_id(item_id)
        
        if not item:
            return jsonify({"error": "Inventory item not found"}), 404
        
        # If the item doesn't have a location or region, we can't activate an LED
        if not item['location_id'] or not item['region_id']:
            return jsonify({"error": "Item does not have a specific location with region"}), 400
        
        location = get_location_by_id(item['location_id'])
        region = get_region_by_id(item['region_id'])
        
        if not location or not region:
            return jsonify({"error": "Location or region not found"}), 404
        
        # Return the data needed for LED activation
        return jsonify({
            'item': {
                'id': item['id'],
                'name': item['name']
            },
            'location': {
                'id': location['id'],
                'name': location['name']
            },
            'region': {
                'id': region['id'],
                'name': region['name'],
                'x': region['x_coord'],
                'y': region['y_coord'],
                'width': region['width'],
                'height': region['height']
            },
            # Center point of the region (for LED positioning)
            'ledPosition': {
                'x': region['x_coord'] + (region['width'] / 2),
                'y': region['y_coord'] + (region['height'] / 2)
            }
        })
    except Exception as e:
        print(f"Error fetching LED activation data: {e}")
        return jsonify({"error": "Failed to fetch LED activation data"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
