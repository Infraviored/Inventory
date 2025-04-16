from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
from werkzeug.utils import secure_filename
from pathlib import Path
import json
from database import (
    init_db, get_locations, get_location_by_id, add_location, update_location, delete_location,
    get_location_regions, get_region_by_id, add_location_region, delete_location_region,
    get_inventory_items, get_inventory_item_by_id, add_inventory_item, update_inventory_item, delete_inventory_item,
    search_items, get_location_breadcrumbs
)

# Initialize Flask app
app = Flask(__name__, static_folder='../public')
CORS(app)

# Ensure uploads directory exists
UPLOADS_DIR = Path('../public/uploads')
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Initialize database
init_db()

# Helper function to generate unique filenames
def generate_unique_filename(original_filename):
    filename, ext = os.path.splitext(original_filename)
    return f"{filename}_{uuid.uuid4().hex}{ext}"

# Helper function to handle image uploads
def handle_image_upload(image_file, old_image_path=None):
    if not image_file or not image_file.filename:
        return old_image_path
        
    # Delete old image if it exists
    if old_image_path and os.path.exists(UPLOADS_DIR / old_image_path):
        os.remove(UPLOADS_DIR / old_image_path)
    
    filename = generate_unique_filename(secure_filename(image_file.filename))
    image_file.save(UPLOADS_DIR / filename)
    return filename

# Helper function to format location data
def format_location(location):
    return {
        'id': location['id'],
        'name': location['name'],
        'description': location['description'],
        'parentId': location['parent_id'],
        'imagePath': f"/uploads/{location['image_path']}" if location['image_path'] else None,
        'createdAt': location['created_at'],
        'updatedAt': location['updated_at']
    }

# Helper function to format inventory item data
def format_inventory_item(item):
    return {
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
    }

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
        
        return jsonify([format_location(location) for location in locations])
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return jsonify({"error": "Failed to fetch locations"}), 500

@app.route('/api/locations', methods=['POST'])
def add_location_route():
    try:
        # Validate required fields
        if 'name' not in request.form:
            return jsonify({"error": "Missing required field: name"}), 400
        
        name = request.form.get('name')
        description = request.form.get('description')
        parent_id_str = request.form.get('parentId')
        parent_id = int(parent_id_str) if parent_id_str else None
        location_type = request.form.get('locationType')
        
        # Process regions data if available
        regions_data = []
        regions_json = request.form.get('regions')
        if regions_json:
            try:
                regions_data = json.loads(regions_json)
                if not isinstance(regions_data, list):
                    regions_data = []
            except json.JSONDecodeError:
                regions_data = []
        
        # Handle image upload
        image_path = handle_image_upload(request.files.get('image'))
        
        # Create the location
        location_id = add_location(name, parent_id, description, image_path)
        
        # Add regions if provided
        if regions_data and location_id:
            for region in regions_data:
                if all(key in region for key in ['name', 'x', 'y', 'width', 'height']):
                    add_location_region(
                        location_id,
                        region['name'],
                        region['x'],
                        region['y'],
                        region['width'],
                        region['height']
                    )
        
        new_location = get_location_by_id(location_id)
        
        # Get the regions for this location
        location_regions = []
        regions = get_location_regions(location_id)
        location_regions = [{
            'id': r['id'],
            'name': r['name'],
            'x': r['x_coord'],
            'y': r['y_coord'],
            'width': r['width'],
            'height': r['height']
        } for r in regions]
        
        response = format_location(new_location)
        response['regions'] = location_regions
        response['locationType'] = location_type
        
        return jsonify(response), 201
    except Exception as e:
        print(f"Error creating location: {e}")
        return jsonify({"error": f"Failed to create location: {str(e)}"}), 500

@app.route('/api/locations/<int:location_id>', methods=['GET', 'PUT', 'DELETE'])
def location_route(location_id):
    try:
        location = get_location_by_id(location_id)
        
        if not location:
            return jsonify({"error": "Location not found"}), 404
        
        if request.method == 'GET':
            return jsonify(format_location(location))
            
        elif request.method == 'PUT':
            name = request.form.get('name')
            description = request.form.get('description')
            parent_id_str = request.form.get('parentId')
            parent_id = int(parent_id_str) if parent_id_str else None
            
            # Handle image upload
            image_path = handle_image_upload(request.files.get('image'), location['image_path'])
            
            update_location(location_id, name, parent_id, description, image_path)
            updated_location = get_location_by_id(location_id)
            
            return jsonify(format_location(updated_location))
            
        elif request.method == 'DELETE':
            # Delete associated image if it exists
            if location['image_path'] and os.path.exists(UPLOADS_DIR / location['image_path']):
                os.remove(UPLOADS_DIR / location['image_path'])
            
            delete_location(location_id)
            return jsonify({"success": True})
            
    except Exception as e:
        print(f"Error handling location: {e}")
        return jsonify({"error": f"Failed to {request.method.lower()} location"}), 500

@app.route('/api/locations/<int:location_id>/breadcrumbs', methods=['GET'])
def get_breadcrumbs_route(location_id):
    try:
        breadcrumbs = get_location_breadcrumbs(location_id)
        
        if not breadcrumbs:
            return jsonify({"error": "Location not found"}), 404
        
        return jsonify([{'id': location['id'], 'name': location['name']} for location in breadcrumbs])
    except Exception as e:
        print(f"Error fetching breadcrumbs: {e}")
        return jsonify({"error": "Failed to fetch breadcrumbs"}), 500

# Region routes
@app.route('/api/locations/<int:location_id>/regions', methods=['GET', 'POST'])
def regions_route(location_id):
    try:
        # Check if location exists
        location = get_location_by_id(location_id)
        if not location:
            return jsonify({"error": f"Location with ID {location_id} not found"}), 404
        
        if request.method == 'GET':
            regions = get_location_regions(location_id)
            transformed_regions = [{
                'id': region['id'],
                'locationId': region['location_id'],
                'name': region['name'],
                'x': region['x_coord'],
                'y': region['y_coord'],
                'width': region['width'],
                'height': region['height']
            } for region in regions]
            
            return jsonify(transformed_regions)
            
        elif request.method == 'POST':
            if not request.is_json:
                return jsonify({"error": "Request must be JSON"}), 400
                
            data = request.json
            
            # Validate required fields
            required_fields = ['name', 'x', 'y', 'width', 'height']
            for field in required_fields:
                if field not in data:
                    return jsonify({"error": f"Missing required field: {field}"}), 400
            
            # Add region to database
            region_id = add_location_region(
                location_id, 
                data['name'], 
                data['x'], 
                data['y'], 
                data['width'], 
                data['height']
            )
            
            # Get newly created region
            new_region = get_region_by_id(region_id)
            
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
            
            return jsonify(response), 201
            
    except Exception as e:
        print(f"Error handling regions: {e}")
        return jsonify({"error": f"Failed to {request.method.lower()} regions"}), 500

# Inventory routes
@app.route('/api/inventory', methods=['GET', 'POST'])
def inventory_route():
    try:
        if request.method == 'GET':
            location_id = request.args.get('locationId')
            region_id = request.args.get('regionId')
            
            if location_id:
                location_id = int(location_id)
            
            if region_id:
                region_id = int(region_id)
            
            items = get_inventory_items(location_id, region_id)
            return jsonify([format_inventory_item(item) for item in items])
            
        elif request.method == 'POST':
            # Validate required fields
            if 'name' not in request.form:
                return jsonify({"error": "Missing required field: name"}), 400
            
            name = request.form.get('name')
            description = request.form.get('description')
            quantity = int(request.form.get('quantity', 1))
            location_id = int(request.form.get('locationId')) if request.form.get('locationId') else None
            region_id = int(request.form.get('regionId')) if request.form.get('regionId') else None
            
            # Validate location and region if provided
            if location_id and not get_location_by_id(location_id):
                return jsonify({"error": f"Location with ID {location_id} not found"}), 404
                
            if region_id and not get_region_by_id(region_id):
                return jsonify({"error": f"Region with ID {region_id} not found"}), 404
            
            # Handle image upload
            image_path = handle_image_upload(request.files.get('image'))
            
            # Add the item to the database
            item_id = add_inventory_item(
                name, 
                description, 
                quantity, 
                image_path, 
                location_id, 
                region_id
            )
            
            new_item = get_inventory_item_by_id(item_id)
            return jsonify(format_inventory_item(new_item)), 201
            
    except Exception as e:
        print(f"Error handling inventory: {e}")
        return jsonify({"error": f"Failed to {request.method.lower()} inventory"}), 500

@app.route('/api/inventory/<int:item_id>', methods=['GET', 'PUT', 'DELETE'])
def inventory_item_route(item_id):
    try:
        item = get_inventory_item_by_id(item_id)
        
        if not item:
            return jsonify({"error": "Inventory item not found"}), 404
        
        if request.method == 'GET':
            return jsonify(format_inventory_item(item))
            
        elif request.method == 'PUT':
            name = request.form.get('name')
            description = request.form.get('description')
            quantity = int(request.form.get('quantity', 1))
            location_id = int(request.form.get('locationId')) if request.form.get('locationId') else None
            region_id = int(request.form.get('regionId')) if request.form.get('regionId') else None
            
            # Handle image upload
            image_path = handle_image_upload(request.files.get('image'), item['image_path'])
            
            update_inventory_item(item_id, name, description, quantity, image_path, location_id, region_id)
            updated_item = get_inventory_item_by_id(item_id)
            
            return jsonify(format_inventory_item(updated_item))
            
        elif request.method == 'DELETE':
            # Delete associated image if it exists
            if item['image_path'] and os.path.exists(UPLOADS_DIR / item['image_path']):
                os.remove(UPLOADS_DIR / item['image_path'])
            
            delete_inventory_item(item_id)
            return jsonify({"success": True})
            
    except Exception as e:
        print(f"Error handling inventory item: {e}")
        return jsonify({"error": f"Failed to {request.method.lower()} inventory item"}), 500

# Search route
@app.route('/api/search', methods=['GET'])
def search_route():
    try:
        query = request.args.get('q')
        
        if not query:
            return jsonify([])
        
        results = search_items(query)
        return jsonify([format_inventory_item(item) for item in results])
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
            'ledPosition': {
                'x': region['x_coord'] + (region['width'] / 2),
                'y': region['y_coord'] + (region['height'] / 2)
            }
        })
    except Exception as e:
        print(f"Error fetching LED activation data: {e}")
        return jsonify({"error": "Failed to fetch LED activation data"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
