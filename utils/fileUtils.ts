import { AttachedFile } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set up the worker source. This is crucial for pdf.js to work in a non-bundled environment.
// The import map will resolve this path to the correct esm.sh CDN URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';


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
 * Converts a File object to a text string.
 * @param file The File object to convert.
 * @returns A promise that resolves with the text content of the file.
 */
export const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
};

/**
 * Extracts text content from a PDF file.
 * @param file The PDF file.
 * @returns A promise that resolves with the extracted text.
 */
async function fileToTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map(item => (item as TextItem).str).join(' ');
        if (i < pdf.numPages) {
            textContent += '\n\n--- Page Break ---\n\n';
        }
    }
    return textContent;
}

/**
 * Extracts text content from a DOCX file.
 * @param file The DOCX file.
 * @returns A promise that resolves with the extracted text.
 */
async function fileToTextFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const SUPPORTED_VIDEO_MIME_TYPES = [
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 
    'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
];
export const SUPPORTED_TEXT_MIME_TYPES = [
    'text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/html', 'text/xml', 'application/javascript', 'text/css'
];
export const SUPPORTED_DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

export const SUPPORTED_GENERATE_CONTENT_MIME_TYPES = [
    ...SUPPORTED_IMAGE_MIME_TYPES, 
    ...SUPPORTED_VIDEO_MIME_TYPES, 
    ...SUPPORTED_TEXT_MIME_TYPES,
    ...SUPPORTED_DOCUMENT_MIME_TYPES,
];


/**
 * Processes an array of File objects into the application's AttachedFile format,
 * filtering for supported MIME types.
 * @param files An array of File objects.
 * @param allowedMimeTypes An array of strings representing allowed MIME types.
 * @param onUnsupported A callback function that is triggered for each unsupported file.
 * @returns A promise that resolves with an array of successfully processed AttachedFile objects.
 */
export const processFiles = async (
  files: File[],
  allowedMimeTypes: string[],
  onUnsupported: (fileName: string, fileType: string) => void
): Promise<AttachedFile[]> => {
  const processedFiles: AttachedFile[] = [];
  for (const file of files) {
    if (allowedMimeTypes.includes(file.type)) {
        const attachedFile: Partial<AttachedFile> = {
            name: file.name,
            mimeType: file.type,
        };

        try {
            if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
                attachedFile.textContent = await fileToText(file);
            } else if (file.type === 'application/pdf') {
                attachedFile.textContent = await fileToTextFromPdf(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                attachedFile.textContent = await fileToTextFromDocx(file);
            } else if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type)) {
                attachedFile.base64 = await fileToBase64(file);
            } else {
                onUnsupported(file.name, file.type || 'unknown');
                continue;
            }
            processedFiles.push(attachedFile as AttachedFile);
        } catch (e: any) {
             console.error(`Error processing file ${file.name}:`, e);
             onUnsupported(file.name, `${file.type} (could not be read)`);
        }

    } else {
      onUnsupported(file.name, file.type || 'unknown');
    }
  }
  return processedFiles;
};