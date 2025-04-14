# Deployment Instructions for Inventory Project

## Local Development Testing

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- Python (v3.6 or higher)
- Flask and required Python packages
- Git

### Steps for Local Testing

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

## Manus Computer Deployment

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

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub account (with repository access)
- Separate hosting for the Python Flask backend

### Option 1: Automatic Deployment via GitHub Integration

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com/
   - Sign in with your Cloudflare account

2. **Set Up Pages Project**
   - Navigate to "Pages" in the sidebar
   - Click "Create a project"
   - Select "Connect to Git"

3. **Connect to GitHub Repository**
   - Select the GitHub account where the repository is located
   - Find and select the "Inventory" repository
   - Configure your build settings:
     - Build command: `npm run build`
     - Build output directory: `.next`
     - Root directory: `/` (default)

4. **Configure Environment Variables**
   - Add the following environment variables:
     - `NEXT_PUBLIC_API_BASE_URL`: URL of your Python Flask backend (must be hosted separately)

5. **Deploy**
   - Click "Save and Deploy"
   - Wait for the build and deployment to complete
   - Cloudflare will provide a URL for your deployed site (e.g., https://your-project.pages.dev)

### Option 2: Manual Deployment via Wrangler CLI

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Log in to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Deploy to Cloudflare Pages**
   ```bash
   wrangler pages publish .next --project-name inventory
   ```

5. **Access Your Deployed Site**
   - After deployment, Wrangler will provide a URL for your site
   - Typically in the format: https://inventory.pages.dev

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

## Additional Notes

- The application requires the Python Flask backend for all data operations
- The API proxy implementation in `src/app/api/proxy/[...path]/route.ts` handles communication between frontend and backend
- For production use with multiple users, ensure the backend is properly secured and scaled
