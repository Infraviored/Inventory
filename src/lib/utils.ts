import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to generate a unique filename for uploaded images
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

// Helper function to extract tags from item name and description
export function extractTags(name: string, description: string | null): string[] {
  const tags = new Set<string>();
  
  // Add the name and each word in the name as a tag
  tags.add(name.toLowerCase());
  name.split(/\s+/).forEach(word => {
    if (word.length > 2) {
      tags.add(word.toLowerCase());
    }
  });
  
  // Add words from description if available
  if (description) {
    description.split(/\s+/).forEach(word => {
      if (word.length > 3) {
        tags.add(word.toLowerCase());
      }
    });
  }
  
  return Array.from(tags);
}

// Helper function to format date
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
