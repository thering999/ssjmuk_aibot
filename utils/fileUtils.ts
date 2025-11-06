import { AttachedFile } from '../types';

/**
 * Converts a File object to a Base64 encoded string.
 * @param file The File object to convert.
 * @returns A promise that resolves with the Base64 string (without the data URI prefix).
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Processes an array of File objects into the application's AttachedFile format.
 * @param files An array of File objects.
 * @returns A promise that resolves with an array of AttachedFile objects.
 */
export const processFiles = async (files: File[]): Promise<AttachedFile[]> => {
  const processedFiles: AttachedFile[] = [];
  for (const file of files) {
    const base64 = await fileToBase64(file);
    processedFiles.push({
      base64,
      mimeType: file.type || 'application/octet-stream',
      name: file.name,
    });
  }
  return processedFiles;
};
