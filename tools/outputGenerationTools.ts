import { FunctionDeclaration, Type } from '@google/genai';

export const outputGenerationTools: FunctionDeclaration[] = [
  {
    name: 'generateImage',
    description: 'Generates an image based on a descriptive prompt from the user. Use this when the user asks to create, draw, or see a picture of something.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: 'A detailed description of the image to be generated. For example: "A photo of a healthy salad with grilled chicken breast."',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'createDocument',
    description: "Creates a downloadable text or markdown file from provided content. Useful for summaries, outlines, or content structured for presentations. The user can then copy this content into other applications like PowerPoint or Google Slides.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description: 'The textual content to be placed in the document. This can be plain text or formatted as Markdown.',
        },
        fileName: {
            type: Type.STRING,
            description: 'The desired name for the file, including the extension (e.g., "summary.txt", "presentation_outline.md"). Defaults to "document.txt" if not specified.'
        }
      },
      required: ['content'],
    },
  },
];
