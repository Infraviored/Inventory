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
- **Cross-Origin Support**: Flask-CORS middleware for frontend access
- **File Handling**: Werkzeug utilities for secure file uploads
- **Error Handling**: Comprehensive try-catch blocks with detailed error responses
- **Response Format**: Standardized JSON responses with appropriate HTTP status codes

### Communication Pattern
- **API Communication**: HTTP REST API with JSON payloads
- **Data Validation**: Server-side validation of all incoming requests
- **Error Handling**: Structured error responses with descriptive messages
- **File Transfers**: Multi-part form data for image uploads

## Repository Structure

### Root Directory
```
/
├── .next/                # Next.js build output
├── api/                  # Python Flask backend
├── backup_local_storage/ # Alternative browser storage implementation
├── data/                 # Database storage directory
├── node_modules/         # Frontend dependencies
├── public/               # Static files and uploaded images
├── src/                  # Frontend source code
├── .gitignore            # Git ignore file
├── next-env.d.ts         # Next.js TypeScript declarations
├── next.config.js        # Next.js configuration
├── package-lock.json     # NPM dependency lock file
├── package.json          # Frontend package configuration
├── postcss.config.js     # PostCSS configuration for Tailwind
├── README.md             # This documentation file
├── reset-and-start.sh    # Script to reset database and restart app
├── start.sh              # Script to start development environment
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
└── locales/              # Internationalization files
```

### Alternative Storage (`/backup_local_storage`)
```
backup_local_storage/
├── api/                  # API implementation using browser storage
├── json-db_local.js      # JSON file-based storage implementation (8.4KB)
├── kv-db_local.js        # Key-value based storage implementation (10KB)
└── memory-db_local.js    # In-memory storage implementation (8.5KB)
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

### Alternative Storage Options
The system provides alternative storage implementations in the `backup_local_storage` directory:

1. **JSON File Storage** (`json-db_local.js`)
   - Stores data in JSON files on the filesystem
   - Provides persistence without a database server
   - Suitable for simple deployments

2. **Key-Value Storage** (`kv-db_local.js`)
   - Uses browser's localStorage/IndexedDB for persistence
   - Enables fully client-side operation without a backend
   - Data remains in the user's browser

3. **In-Memory Storage** (`memory-db_local.js`)
   - Temporary runtime storage with no persistence
   - Useful for testing and development
   - Resets when the application restarts

These alternative implementations allow the application to run without a database server, providing flexibility for different deployment scenarios.

## Key Components

### Region Mapper (24KB)
The `region-mapper.tsx` component is a sophisticated visual interface that allows users to:
- Define rectangular regions on location images
- Draw regions interactively with a click-and-drag interface
- Enter precise coordinates for exact region placement
- Name, resize, move, and delete regions
- Visualize region dimensions and positions
- Select existing regions for editing

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

## Deployment Options

The application is designed for flexible deployment options:

### Development Environment
- **Start Script**: `start.sh` for local development
  - Automatically initializes database if needed
  - Starts Flask backend on port 5000
  - Starts Next.js frontend on port 3000
  - Provides clean shutdown of both services

### Reset and Fresh Start
- **Reset Script**: `reset-and-start.sh`
  - Stops any running instances
  - Deletes the existing database
  - Initializes a fresh database instance
  - Starts both backend and frontend servers

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
   - Backend: API routes within Next.js or separate serverless functions
   - Database: Migrate to a managed database service
   - Best for scalable public deployments

4. **Offline/Browser-Only Mode**
   - Use the implementations in the `backup_local_storage` directory
   - Replace backend API calls with browser storage
   - All data stays on the client device
   - Suitable for privacy-focused users or offline scenarios

### Deployment Considerations
- **Data Persistence**: Ensure database file and uploads directory are properly persisted
- **Network Configuration**: Configure CORS settings for production domains
- **Security**: Implement appropriate access controls and authentication in production
- **Scaling**: Consider database migration for high-traffic scenarios

## Recent Changes and Updates

### Backend Optimizations
The Flask backend (`api/app.py`) has been significantly streamlined and optimized:
- Consolidated duplicate endpoint handlers into unified route functions
- Added helper functions for common operations like image upload handling and response formatting
- Standardized error handling patterns across all routes
- Improved code organization and reduced redundancy
- Better file management for uploaded images

### Frontend Enhancements
Major improvements to the frontend components:
- Complete redesign of the RegionMapper component for better usability
- Added two-click region creation for more intuitive interaction
- Implemented region manipulation features (resize, move, copy)
- Enhanced visual feedback during region creation and editing
- Added manual dimension input for precise region placement
- Improved image upload workflow with better error handling and feedback

## System Requirements
- **Server**: Any system capable of running Python 3.8+ and Node.js 16+
- **Storage**: Minimal - starts at ~10MB for the application, scales with data volume
- **Memory**: 512MB minimum, 1GB+ recommended for concurrent operations
- **Network**: Standard HTTP/HTTPS ports (80/443) for production deployments
- **Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/inventory.git
   cd inventory
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

3. **Start the development servers**
   ```bash
   ./start.sh
   ```

4. **Access the application**
   Open your browser and navigate to http://localhost:3000
