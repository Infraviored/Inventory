import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
// NextResponse is not used, can be removed if not needed elsewhere.

// const UPLOADS_DIR_RELATIVE_TO_PUBLIC = 'uploads'; // Old
// const UPLOADS_DIR_ABSOLUTE = path.resolve(process.cwd(), 'public', UPLOADS_DIR_RELATIVE_TO_PUBLIC); // Old

const BASE_IMAGES_PATH = path.resolve(process.cwd(), 'data', 'images');

// Ensure category-specific uploads directory exists
async function ensureCategoryUploadsDirExists(category: string) {
    if (!category || typeof category !== 'string' || category.includes('..') || category.includes('/')) {
        throw new Error(`Invalid category: ${category}`);
    }
    const categoryPath = path.join(BASE_IMAGES_PATH, category);
    try {
        await fs.mkdir(categoryPath, { recursive: true });
        // console.log(`[FileHandler] Uploads directory for category "${category}" ensured: ${categoryPath}`);
    } catch (error) {
        console.error(`[FileHandler] Error creating uploads directory for category "${category}":`, error);
        throw error; // Re-throw to indicate failure
    }
}

// No longer need a single ensureUploadsDirExists() call on module load, 
// as it will be category-specific and called within saveUpload.

// Generates a unique filename while preserving the extension
function generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    // Sanitize basename slightly (replace spaces, etc.) - adjust as needed
    const sanitizedBase = baseName.replace(/\\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    return `${sanitizedBase}_${randomUUID()}${ext}`;
}

/**
 * Saves an uploaded file to the server under a specific category.
 * @param file The File object to save.
 * @param category The category (subdirectory) to save the file in (e.g., 'locations', 'inventory').
 * @returns The filename of the saved file.
 * @throws Will throw an error if saving fails.
 */
export async function saveUpload(file: File, category: string): Promise<string> {
    if (!file || typeof file.arrayBuffer !== 'function') {
        throw new Error('Invalid file object provided to saveUpload.');
    }
    if (!category) {
        throw new Error('Category must be provided to saveUpload.');
    }

    await ensureCategoryUploadsDirExists(category); // Ensure directory for this category

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = generateUniqueFilename(file.name);
    const categoryUploadPath = path.join(BASE_IMAGES_PATH, category);
    const filePath = path.join(categoryUploadPath, filename);

    try {
        await fs.writeFile(filePath, new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length));
        console.log(`[FileHandler] File saved successfully to: ${filePath}`);
        // Return just the filename, the category is known by context where it's saved/retrieved
        return filename;
    } catch (error)      {
        console.error('[FileHandler] Error saving file:', error);
        throw new Error(`Failed to save file: ${(error as Error).message}`);
    }
}

/**
 * Deletes an uploaded file from the server.
 * @param categoryAndFilename The category-prefixed path of the file to delete (e.g., locations/filename.ext or inventory/item.png).
 * @throws Will throw an error if deletion fails (e.g., file not found), but logs it.
 */
export async function deleteUpload(categoryAndFilename: string): Promise<void> {
    if (!categoryAndFilename) {
        console.warn('[FileHandler] deleteUpload called with no path.');
        return;
    }

    // Path is expected to be like "category/filename.ext"
    // Validate to prevent path traversal: ensure it doesn't start with '/' or '..', and contains a single '/'
    if (categoryAndFilename.startsWith('/') || categoryAndFilename.startsWith('..') || categoryAndFilename.split('/').length !== 2) {
        console.error(`[FileHandler] Invalid path for deletion: ${categoryAndFilename}. Path must be in 'category/filename.ext' format.`);
        // Optionally throw an error here if stricter handling is needed
        // throw new Error(`Invalid path format for deletion: ${categoryAndFilename}`);
        return; // Or return early if we don't want to throw
    }
    
    const filePath = path.join(BASE_IMAGES_PATH, categoryAndFilename);

    try {
        await fs.unlink(filePath);
        console.log(`[FileHandler] File deleted successfully: ${filePath}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[FileHandler] File not found for deletion (may have already been deleted): ${filePath}`);
        } else {
            console.error(`[FileHandler] Error deleting file ${filePath}:`, error);
            // Optionally re-throw
            // throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
}

// console.log('[FileHandler] File Handler initialized. Base images path:', BASE_IMAGES_PATH); // Updated log
// Initial log can be simpler or removed if ensureCategoryUploadsDirExists is called on demand.
console.log(`[FileHandler] File Handler initialized. Images will be saved to subdirectories under: ${BASE_IMAGES_PATH}`); 