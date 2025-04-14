# Home Inventory System

A comprehensive system for tracking household items, their locations, and organizing personal possessions with visual mapping capabilities.

## Repository Overview

This repository contains a complete web-based home inventory management system with a React/Next.js frontend and a Python Flask backend. The system allows users to:

- Create hierarchical storage locations (rooms, cabinets, drawers, etc.)
- Define visual regions on location images for precise item placement
- Add inventory items with details and images
- Search and filter inventory by various criteria
- Navigate through the storage hierarchy

## System Architecture

The application follows a client-server architecture with clear separation of concerns:

### Frontend (Client-side)
- **Framework**: Next.js 14 (React) with App Router
- **UI Components**: Custom components built on Tailwind and shadcn/ui
- **State Management**: React hooks for local state and context for shared state
- **Styling**: Tailwind CSS for utility-first styling approach
- **API Integration**: Custom API client with TypeScript interfaces
- **Image Processing**: Client-side image cropping and manipulation before upload
- **Rendering Strategy**: Hybrid rendering with:
  - Server Components for initial page loads
  - Client Components for interactive elements
  - Static generation for stable content

### Backend (Server-side)
- **API Server**: Python Flask RESTful API
- **Database**: SQLite for data persistence
- **Cross-Origin Support**: Flask-CORS middleware for frontend access
- **File Handling**: Werkzeug utilities for secure file uploads
- **Error Handling**: Comprehensive try-catch blocks with detailed error responses
- **Response Format**: Standardized JSON responses with appropriate HTTP status codes

### Communication Pattern
- **API Communication**: HTTP REST API with JSON payloads
- **API Proxy**: Next.js API routes proxy requests to Flask backend
- **Data Validation**: Server-side validation of all incoming requests
- **Error Handling**: Structured error responses with descriptive messages
- **File Transfers**: Multi-part form data for image uploads

## Repository Structure

### Root Directory
```
/
├── .next/                # Next.js build output
├── api/                  # Python Flask backend
├── data/                 # Database storage directory
├── documentation/        # Project documentation
├── node_modules/         # Frontend dependencies
├── public/               # Static files and uploaded images
├── src/                  # Frontend source code
├── .env.local            # Environment variables for API configuration
├── .gitignore            # Git ignore file
├── launch.sh             # Script to launch both frontend and backend
├── next-env.d.ts         # Next.js TypeScript declarations
├── next.config.js        # Next.js configuration
├── package-lock.json     # NPM dependency lock file
├── package.json          # Frontend package configuration
├── postcss.config.js     # PostCSS configuration for Tailwind
├── tailwind-output.css   # Generated Tailwind styles
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

### Backend Structure (`/api`)
```
api/
├── __pycache__/          # Python bytecode cache
├── data/                 # Database storage
├── migrations/           # SQL migration scripts
├── public/               # Backend public directory
├── venv/                 # Python virtual environment
├── __init__.py           # Python package marker
├── app.py                # Main Flask application (16KB, 434 lines)
├── database.py           # Database interaction layer (12KB, 429 lines)
├── requirements.txt      # Python dependencies
└── test_api.py           # API test suite
```

### Frontend Structure (`/src`)
```
src/
├── app/                  # Next.js app router pages
│   ├── api/              # API routes including proxy to backend
│   └── ...               # Page components
├── components/           # React components
│   ├── ui/               # Base UI components
│   ├── image-input.tsx   # Image upload component
│   ├── inventory-item-form.tsx # Form for adding/editing items
│   ├── inventory-items.tsx # Item listing component
│   ├── language-toggle.tsx # Language switching component
│   ├── layout.tsx        # Layout wrapper component
│   ├── location-carousel.tsx # Location navigation component
│   ├── location-form.tsx # Form for adding/editing locations
│   ├── location-management.tsx # Location management component
│   ├── providers.tsx     # React context providers
│   ├── region-mapper.tsx # Visual region mapping component (24KB)
│   ├── search-form.tsx   # Search interface component
│   ├── theme-provider.tsx # Theme context provider
│   └── theme-toggle.tsx  # Light/dark mode toggle
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and API clients
│   ├── api.ts            # API client for backend communication
│   ├── storage-provider.ts # Storage abstraction layer
│   └── ...               # Other utility functions
└── locales/              # Internationalization files
```

## Data Management

### Database Design
- **Database Engine**: SQLite (file-based relational database)
- **Schema Management**: SQL migration scripts in the `/api/migrations` directory
- **Data Location**: Database file stored in the `/api/data` directory
- **Initialization**: Automatic database initialization on first run

### Database Schema
The database consists of the following tables:

1. **locations**
   - Storage for physical locations (rooms, furniture, containers)
   - Hierarchical structure using parent_id self-reference
   - Supports image paths for visual representation
   - Tracks creation and modification timestamps

2. **location_regions**
   - Defines rectangular regions within location images
   - Stores coordinates (x, y, width, height) for visual mapping
   - Links to parent location via foreign key
   - Used for precise item placement visualization

3. **inventory_items**
   - Core storage for inventory objects
   - Links to locations and regions via foreign keys
   - Stores metadata (name, description, quantity)
   - Tracks image paths for visual representation

4. **item_tags**
   - Auxiliary table for improved search functionality
   - Stores normalized tags extracted from item names and descriptions
   - Enables efficient fuzzy searching capabilities

## Key Components

### Region Mapper (24KB)
The `region-mapper.tsx` component is a sophisticated visual interface that allows users to:
- Define rectangular regions on location images
- Draw regions interactively with a click-and-drag interface
- Enter precise coordinates for exact region placement
- Name, resize, move, and delete regions
- Visualize region dimensions and positions
- Select existing regions for editing
- Automatically start drawing mode when "Add New Region" is clicked

This component enables precise spatial organization of inventory items within locations, making it easier to locate items in the real world.

### Location Form
The `location-form.tsx` component provides:
- Creation of hierarchical storage locations
- Image upload with preview
- Region mapping capabilities via the RegionMapper component
- Type categorization (room, cabinet, drawer, etc.)
- Parent-child relationship management

### Inventory Item Form
The `inventory-item-form.tsx` component offers:
- Item detail entry (name, description, quantity)
- Image upload with preview
- Location and region assignment
- Validation and error handling

### API Proxy
The application includes a Next.js API proxy that:
- Routes frontend requests to the Flask backend
- Handles CORS issues automatically
- Uses environment variables for flexible configuration
- Provides consistent error handling
- Simplifies deployment across different environments

## Deployment and Launch Instructions

### Local Development Testing

#### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- Python (v3.6 or higher)
- Flask and required Python packages
- Git

#### Steps for Local Testing

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Infraviored/Inventory.git
   cd Inventory
   ```

2. **Switch to the Manus Branch**
   ```bash
   git checkout manus
   ```

3. **Install Dependencies**
   ```bash
   npm install
   cd api
   pip install flask flask-cors
   cd ..
   ```

4. **Using the Launch Script (Recommended)**
   The project includes a launch script that handles both frontend and backend services:
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```
   This script will:
   - Stop any existing services
   - Start the Flask backend on port 5000
   - Configure the API proxy environment variables
   - Start the Next.js frontend on port 3000 with Turbopack for faster development
   
   > **Note:** During development (especially in the Manus environment), we use Turbopack for faster refresh times and improved developer experience. This is configured in the package.json file with the `--turbopack` flag in the dev script.

5. **Manual Startup (Alternative)**
   If you prefer to start services manually:
   
   **Backend (Terminal 1):**
   ```bash
   cd api
   python app.py
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   # Set the API base URL environment variable
   export NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
   npm run dev
   ```

6. **API Proxy Configuration**
   The application uses a Next.js API proxy to communicate with the Flask backend:
   
   - For local development: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
   - For Manus or other remote environments: `NEXT_PUBLIC_API_BASE_URL=https://5000-[your-instance-id].manus.computer`
   
   This environment variable can be set:
   - In the `.env.local` file
   - As an environment variable when starting the Next.js server
   - Automatically by the launch script

7. **Testing the Application**
   - Open your browser and navigate to http://localhost:3000
   - Test the language switching functionality (EN/DE)
   - Test the region mapper with localization
   - Test the database functionality by adding locations and items
   - Verify API connectivity by checking that locations load without errors

### Manus Computer Deployment

When deploying on Manus computer:

1. **Clone and Setup**
   ```bash
   git clone https://github.com/Infraviored/Inventory.git
   cd Inventory
   git checkout manus
   npm install
   ```

2. **Launch Services**
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```

3. **Expose Ports**
   Expose both the frontend and backend ports:
   - Frontend: Port 3000
   - Backend: Port 5000

4. **Update Environment Configuration**
   If you encounter API connectivity issues:
   
   1. Get your Manus computer ID (from the exposed URL)
   2. Update the `.env.local` file:
      ```
      NEXT_PUBLIC_API_BASE_URL=https://5000-[your-manus-id].manus.computer
      ```
   3. Restart the frontend service

### Launch Script Details

The launch script provides a simple way to start both the frontend and backend services with a single command:

```bash
./launch.sh
```

This script will:
1. Stop any existing frontend or backend processes
2. Start the Next.js frontend on port 3000
3. Start the Flask API backend on port 5000
4. Display the URLs for both services
5. Wait for user to press Ctrl+C to stop all services

#### Accessing the Services
After running the launch script, you can access the services at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

#### Stopping the Services
To stop both services, simply press Ctrl+C in the terminal where the launch script is running.

### Production Deployment Options

1. **Traditional Server**
   - Backend: Flask behind a production WSGI server (Gunicorn/uWSGI)
   - Frontend: Next.js with static export or Node.js server
   - Database: SQLite or upgrade to PostgreSQL for higher concurrency
   - Recommended for single-user or low-traffic deployments

2. **Containerized Deployment**
   - Docker containers for isolated environments
   - Docker Compose for multi-container orchestration
   - Volume mounts for persistent data storage
   - Ideal for consistent deployments across environments

3. **Serverless Options**
   - Frontend: Deploy to Vercel or Netlify
   - Backend: Deploy Flask API to a serverless platform
   - Database: Migrate to a managed database service
   - Configure API proxy to point to deployed backend

4. **Cloudflare Pages Deployment**
   
   **Prerequisites**
   - Cloudflare account
   - GitHub account (with repository access)
   - Separate hosting for the Python Flask backend

   **Option 1: Automatic Deployment via GitHub Integration**
   1. Log in to Cloudflare Dashboard
   2. Navigate to "Pages" in the sidebar
   3. Click "Create a project"
   4. Select "Connect to Git"
   5. Connect to GitHub Repository
   6. Configure build settings:
      - Build command: `npm run build`
      - Build output directory: `.next`
   7. Configure Environment Variables:
      - `NEXT_PUBLIC_API_BASE_URL`: URL of your Python Flask backend
   8. Click "Save and Deploy"

   **Option 2: Manual Deployment via Wrangler CLI**
   1. Install Wrangler CLI: `npm install -g wrangler`
   2. Log in to Cloudflare: `wrangler login`
   3. Build the Project: `npm run build`
   4. Deploy to Cloudflare Pages: `wrangler pages publish .next --project-name inventory`

### Deployment Considerations
- **Data Persistence**: Ensure database file and uploads directory are properly persisted
- **Network Configuration**: Configure CORS settings for production domains
- **Security**: Implement appropriate access controls and authentication in production
- **API Proxy**: Update environment variables to point to the correct backend URL
- **Scaling**: Consider database migration for high-traffic scenarios

## API Proxy Configuration

### How the API Proxy Works

The Inventory application uses a Next.js API proxy to forward requests from the frontend to the Flask backend. This approach:

1. Keeps all frontend API requests relative (e.g., `/api/locations`)
2. Handles CORS issues automatically
3. Simplifies deployment by abstracting the backend URL

### Implementation

The API proxy is implemented in:
- `/src/app/api/proxy/[...path]/route.ts` - Catch-all API route handler
- `/src/lib/api.ts` - Frontend API client that uses the proxy

### Environment-Based Configuration

The proxy uses environment variables for the backend URL:
```typescript
// Get backend URL from environment variable or use default for local development
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const backendUrl = `${backendBaseUrl}/api/${path}${queryString ? `?${queryString}` : ''}`;
```

## Project Implementation Summary

### Recent Changes and Updates

#### 1. Database Solution with SQLite Backend
- Created a storage abstraction layer in `src/lib/storage-provider.ts`
- Implemented a Python Flask backend with SQLite database
- Configured Next.js API proxy to communicate with the Flask backend
- Provided a unified interface for all data operations

#### 2. Region Mapper Localization and Functionality
- Enhanced the region-mapper.tsx component with localization support
- Integrated with the existing language system
- Replaced all hardcoded German strings with localized versions
- Fixed image duplication issue in the location form
- Implemented direct region drawing when "Add New Region" is clicked
- Added autoStartDrawing prop to automatically enter drawing mode
- Ensured proper display of UI elements in both English and German

#### 3. Language Support (EN/DE)
- Updated key components with localization support
- Enhanced language files with missing translation keys
- Ensured consistent translations across the application
- Updated both English and German locale files

#### 4. React 19 Compatibility
- Fixed React 19 warnings related to element.ref usage
- Updated component structure to avoid nested button issues
- Ensured proper component hierarchy in theme-toggle.tsx

#### 5. API Proxy Implementation
- Created a Next.js API proxy to communicate with the Flask backend
- Implemented environment-based configuration for backend URL
- Updated launch script to automatically set correct environment variables
- Fixed connectivity issues between frontend and backend

### Frontend Enhancements
Major improvements to the frontend components:
- Complete redesign of the RegionMapper component for better usability
- Added two-click region creation for more intuitive interaction
- Implemented region manipulation features (resize, move, copy)
- Enhanced visual feedback during region creation and editing
- Added manual dimension input for precise region placement
- Improved image upload workflow with better error handling and feedback

### Backend Optimizations
The Flask backend (`api/app.py`) has been significantly streamlined and optimized:
- Consolidated duplicate endpoint handlers into unified route functions
- Added helper functions for common operations like image upload handling and response formatting
- Standardized error handling patterns across all routes
- Improved code organization and reduced redundancy
- Better file management for uploaded images

## Troubleshooting

### Common Issues and Solutions

1. **API Connectivity Issues (500 Errors)**
   - Check that both frontend and backend services are running
   - Verify the `NEXT_PUBLIC_API_BASE_URL` environment variable is set correctly
   - Ensure the backend URL matches your current Manus computer instance
   - Check browser console for specific error messages
   - If using Manus, make sure both ports 3000 and 5000 are exposed

2. **Build Failures**
   - Check the build logs for specific errors
   - Ensure all dependencies are properly installed
   - Verify that the Node.js version is compatible

3. **Database Issues**
   - Ensure SQLite is working correctly
   - Check that the database file has proper permissions
   - Verify database migrations have run successfully

4. **Language Switching Problems**
   - Check browser console for any translation key errors
   - Verify that the language files (en.json, de.json) are properly loaded

5. **Region Mapper Issues**
   - If images are duplicated, check that the region mapper integration is correct
   - Verify that the drawing mode activates when "Add New Region" is clicked

6. **Launch Script Issues**
   - If port 3000 or 5000 is already in use, you may need to manually kill the processes
   - If you get a "Permission denied" error, make sure the script is executable
   - If the backend fails to start, ensure all Python dependencies are installed

## System Requirements
- **Server**: Any system capable of running Python 3.8+ and Node.js 16+
- **Storage**: Minimal - starts at ~10MB for the application, scales with data volume
- **Memory**: 512MB minimum, 1GB+ recommended for concurrent operations
- **Network**: Standard HTTP/HTTPS ports (80/443) for production deployments
- **Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Infraviored/Inventory.git
   cd Inventory
   git checkout manus
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd api
   pip install flask flask-cors
   cd ..
   ```

3. **Start the development servers**
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```

4. **Access the application**
   Open your browser and navigate to http://localhost:3000
