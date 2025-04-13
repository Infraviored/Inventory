# Deployment Instructions for Inventory Project

## Local Development Testing

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
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
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   This will start the development server at http://localhost:3000

5. **Testing the Application**
   - Open your browser and navigate to http://localhost:3000
   - Test the language switching functionality (EN/DE)
   - Test the region mapper with localization
   - Test the database functionality by adding locations and items

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub account (with repository access)

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

4. **Configure Environment Variables** (if needed)
   - Add any required environment variables in the "Environment variables" section

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

## Testing the Deployed Application

1. **Verify Language Support**
   - Test switching between English and German
   - Verify that all UI elements are properly translated

2. **Test Region Mapper**
   - Create a new location with an image
   - Use the region mapper to define regions
   - Verify that all region mapper UI elements are properly localized

3. **Test Database Functionality**
   - Add new inventory items
   - Assign them to locations and regions
   - Verify that data persists between page refreshes (using browser storage)

## Troubleshooting

### Common Issues and Solutions

1. **Build Failures**
   - Check the build logs for specific errors
   - Ensure all dependencies are properly installed
   - Verify that the Node.js version is compatible

2. **Database Issues**
   - For local development, ensure SQLite is working correctly
   - For Cloudflare deployment, check browser console for storage-related errors
   - Clear browser cache and local storage if data appears corrupted

3. **Language Switching Problems**
   - Check browser console for any translation key errors
   - Verify that the language files (en.json, de.json) are properly loaded

4. **Deployment Timeouts**
   - Cloudflare Pages has build time limits (typically 20 minutes)
   - Optimize the build process if it's taking too long

## Additional Notes

- The hybrid database approach automatically detects the environment:
  - In local development, it uses SQLite
  - In Cloudflare Pages deployment, it falls back to browser storage
- No additional configuration is needed for this to work
- For production use with multiple users, consider implementing one of the database options described in the research document
