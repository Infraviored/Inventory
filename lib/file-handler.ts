import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');

// Ensure uploads directory exists on server start (or lazily)
async function ensureUploadsDir(): Promise<void> {
    try {
        await fs.access(UPLOADS_DIR);
    } catch (error) {
        console.log(`Uploads directory not found at ${UPLOADS_DIR}. Creating...`);
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`Uploads directory created.`);
    }
}

// Call it once, potentially during initialization
ensureUploadsDir().catch(err => console.error("Failed to ensure uploads directory:", err));

// Generates a unique filename while preserving the extension
function generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    // Sanitize basename slightly (replace spaces, etc.) - adjust as needed
    const sanitizedBase = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    return `${sanitizedBase}_${randomUUID()}${ext}`;
}

/**
 * Saves an uploaded file to the public/uploads directory.
 * @param file The File object received from FormData.
 * @returns The unique filename under which the file was saved.
 * @throws If saving fails.
 */
export async function saveUpload(file: File): Promise<string> {
    if (!file) {
        throw new Error('No file provided to saveUpload.');
    }
    
    await ensureUploadsDir();

    const uniqueFilename = generateUniqueFilename(file.name);
    const savePath = path.join(UPLOADS_DIR, uniqueFilename);

    console.log(`Attempting to save uploaded file to: ${savePath}`);

    try {
        // Get the file content as an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        // Convert the ArrayBuffer directly to a Uint8Array, which fs.writeFile accepts
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Write the Uint8Array to the file system
        await fs.writeFile(savePath, uint8Array);
        
        console.log(`File saved successfully: ${uniqueFilename}`);
        return uniqueFilename; 
    } catch (error) {
        console.error(`Failed to save file ${uniqueFilename}:`, error);
        throw new Error(`Failed to save uploaded file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes a file from the public/uploads directory.
 * @param filename The name of the file to delete.
 * @returns Promise resolving when deletion is attempted.
 */
export async function deleteUpload(filename: string | null | undefined): Promise<void> {
    if (!filename) {
        console.log('deleteUpload called with no filename, skipping.');
        return; // Nothing to delete
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    console.log(`Attempting to delete file: ${filePath}`);

    try {
        await fs.access(filePath); // Check if file exists
        await fs.unlink(filePath);
        console.log(`File deleted successfully: ${filename}`);
    } catch (error: any) {
        // If the error is ENOENT (file not found), it's not really an error in this context
        if (error.code === 'ENOENT') {
            console.log(`File not found, skipping deletion: ${filename}`);
        } else {
            // Log other errors (e.g., permissions)
            console.error(`Failed to delete file ${filename}:`, error);
            // Decide if you want to throw an error here or just log it
            // throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
} 