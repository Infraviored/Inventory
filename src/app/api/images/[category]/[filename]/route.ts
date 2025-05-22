import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { stat } from 'fs/promises'; // For checking if file exists
import { lookup } from 'mime-types'; // For determining content type

// Base path where images are stored
const BASE_IMAGES_PATH = path.resolve(process.cwd(), 'data', 'images');

// Define allowed categories for security
const ALLOWED_CATEGORIES = ['locations', 'inventory', 'items']; // 'items' as an alias for 'inventory' if needed

export async function GET(
  request: NextRequest, 
  { params }: { params: { category: string; filename: string } }
) {
  const { category, filename } = params;

  // --- Security Validations ---
  // 1. Validate Category
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid image category' }, { status: 400 });
  }

  // 2. Validate Filename (prevent path traversal and invalid characters)
  // It should not contain path separators and should be a simple filename.
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  // Further sanitize or validate filename if needed, e.g., against a regex for expected characters.
  const sanitizedFilename = path.basename(filename); // Ensures it's just the file part
  if (sanitizedFilename !== filename) {
      // This means the original filename might have had path components
      return NextResponse.json({ error: 'Invalid filename format' }, { status: 400 });
  }
  // --- End Security Validations ---

  const filePath = path.join(BASE_IMAGES_PATH, category, sanitizedFilename);

  try {
    // Check if file exists and is a file
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Requested path is not a file' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type
    const contentType = lookup(sanitizedFilename) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        // Add cache headers if desired, e.g.:
        // 'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`[Image API] File not found: ${filePath}`);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    console.error(`[Image API] Error serving file ${filePath}:`, error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
} 