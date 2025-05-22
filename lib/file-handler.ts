import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const UPLOADS_DIR_RELATIVE_TO_PUBLIC = 'uploads';
const UPLOADS_DIR_ABSOLUTE = path.resolve(process.cwd(), 'public', UPLOADS_DIR_RELATIVE_TO_PUBLIC);

// Ensure uploads directory exists
async function ensureUploadsDirExists() {
    try {
        await fs.mkdir(UPLOADS_DIR_ABSOLUTE, { recursive: true });
        // console.log(`[FileHandler] Uploads directory ensured: ${UPLOADS_DIR_ABSOLUTE}`);
    } catch (error) {
        console.error('[FileHandler] Error creating uploads directory:', error);
        // Depending on the application's needs, you might want to throw this error
        // or handle it in a way that doesn't prevent the app from starting.
    }
}

// Call it once when the module loads
ensureUploadsDirExists();

// Generates a unique filename while preserving the extension
function generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    // Sanitize basename slightly (replace spaces, etc.) - adjust as needed
    const sanitizedBase = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    return `${sanitizedBase}_${randomUUID()}${ext}`;
}

/**
 * Saves an uploaded file to the server.
 * @param file The File object to save.
 * @returns The public path to the saved file (e.g., /uploads/filename.ext).
 * @throws Will throw an error if saving fails.
 */
export async function saveUpload(file: File): Promise<string> {
    if (!file || typeof file.arrayBuffer !== 'function') {
        throw new Error('Invalid file object provided to saveUpload.');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to avoid overwrites, or use the original if preferred and handle collisions.
    // For simplicity, using original name prefixed with timestamp if desired, or just original name.
    // Consider a more robust unique naming strategy for production (e.g., UUID + original extension).
    const filename = generateUniqueFilename(file.name);
    const filePath = path.join(UPLOADS_DIR_ABSOLUTE, filename);

    try {
        // Create a Uint8Array view from the ArrayBuffer of the Node.js Buffer
        await fs.writeFile(filePath, new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length));
        console.log(`[FileHandler] File saved successfully: ${filePath}`);
        // Return the public path relative to the public folder
        return `/${UPLOADS_DIR_RELATIVE_TO_PUBLIC}/${filename}`;
    } catch (error) {
        console.error('[FileHandler] Error saving file:', error);
        throw new Error(`Failed to save file: ${(error as Error).message}`);
    }
}

/**
 * Deletes an uploaded file from the server.
 * @param publicPath The public path of the file to delete (e.g., /uploads/filename.ext).
 * @throws Will throw an error if deletion fails (e.g., file not found), but logs it.
 */
export async function deleteUpload(publicPath: string): Promise<void> {
    if (!publicPath) {
        console.warn('[FileHandler] deleteUpload called with no publicPath.');
        return;
    }

    // Convert public path to absolute file system path
    // Example: /uploads/image.png -> /path/to/project/public/uploads/image.png
    const filename = path.basename(publicPath);
    const filePath = path.join(UPLOADS_DIR_ABSOLUTE, filename);

    try {
        await fs.unlink(filePath);
        console.log(`[FileHandler] File deleted successfully: ${filePath}`);
    } catch (error: any) {
        // Log error but don't necessarily throw, as it might be a non-critical cleanup step
        // (e.g., trying to delete a file that was already deleted or never existed).
        if (error.code === 'ENOENT') {
            console.warn(`[FileHandler] File not found for deletion (may have already been deleted): ${filePath}`);
        } else {
            console.error(`[FileHandler] Error deleting file ${filePath}:`, error);
            // Optionally re-throw if this should be a critical failure:
            // throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
}

console.log('[FileHandler] File Handler initialized. Uploads to:', UPLOADS_DIR_ABSOLUTE); 