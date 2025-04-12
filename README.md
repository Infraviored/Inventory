# Home Inventory System - Technical Architecture

## System Architecture

The Home Inventory System follows a client-server architecture with clear separation of concerns:

### Frontend (Client-side)
- **Framework**: Next.js (React) with App Router
- **UI Components**: Custom components built on top of a lightweight UI library
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

## Data Storage

### Database Design
- **Database Engine**: SQLite (file-based relational database)
- **Schema Management**: SQL migration scripts in the `/migrations` directory
- **Data Location**: Database file stored in the `/data` directory
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

### Data Persistence Strategies
The system uses a single backend persistence strategy:

1. **Backend Persistence**
   - Primary storage via SQLite database file located in `/api/data/inventory.db`
   - File system storage for uploaded images (in `/public/uploads`)
   - Database initialized and migrated automatically on first run

2. **Frontend-to-Backend Communication**
   - All data operations go through Next.js API routes that proxy to the Flask backend
   - No client-side data caching/persistence
   - Single source of truth in the SQLite database

3. **Image Storage**
   - Images stored as files in the filesystem
   - Unique filename generation with UUID to prevent collisions
   - Path references stored in the database
   - Automatic cleanup of orphaned images during deletion operations

**Note**: A backup of the previous implementation using localStorage is maintained in the `backup_local_storage` directory, which can be reinstated if needed for alternative deployment scenarios.

## Deployment

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

2. **Containerized Deployment**
   - Docker containers for isolated environments
   - Docker Compose for multi-container orchestration
   - Volume mounts for persistent data storage

3. **Serverless Options**
   - Frontend: Deploy to Vercel or Netlify
   - Backend: API routes within Next.js or separate serverless functions
   - Database: Migrate to a managed database service

### Environment Considerations
- **Data Persistence**: Ensure database file and uploads directory are properly persisted
- **Network Configuration**: Configure CORS settings for production domains
- **Security**: Implement appropriate access controls and authentication in production
- **Scaling**: Consider database migration for high-traffic scenarios

## System Requirements
- **Server**: Any system capable of running Python 3.8+ and Node.js 16+
- **Storage**: Minimal - starts at ~10MB for the application, scales with data volume
- **Memory**: 512MB minimum, 1GB+ recommended for concurrent operations
- **Network**: Standard HTTP/HTTPS ports (80/443) for production deployments
