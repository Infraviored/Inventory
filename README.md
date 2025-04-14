# Home Inventory System

A comprehensive system for tracking household items, their locations, and organizing personal possessions with visual mapping capabilities.

## Documentation

For detailed documentation, please see the [documentation folder](./documentation/README.md).

## Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Infraviored/Inventory.git
   cd Inventory
   git checkout manus
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd api
   pip install flask flask-cors
   cd ..
   ```

3. **Launch the Application**
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```

4. **Access the Application**
   Open your browser and navigate to http://localhost:3000

## Development

During development (especially in the Manus environment), we use Turbopack for faster refresh times and improved developer experience. This is configured in the package.json file with the `--turbopack` flag in the dev script.

## API Proxy Configuration

The application uses a Next.js API proxy to communicate with the Flask backend:
- For local development: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
- For Manus or other remote environments: `NEXT_PUBLIC_API_BASE_URL=https://5000-[your-instance-id].manus.computer`

## Recent Fixes

- Fixed delete functionality in the API proxy and API client
- Fixed region mapper issues including image duplication and region naming
- Added missing translation keys
- Improved error handling in API requests
- Fixed React 19 compatibility issues
