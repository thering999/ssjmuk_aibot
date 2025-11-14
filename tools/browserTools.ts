import { FunctionDeclaration, Type } from '@google/genai';

export const browserTools: FunctionDeclaration[] = [
  {
    name: 'openWebsite',
    description: 'Opens a given URL in a new browser tab. Use this to navigate the user to a website when they ask to open a link, search for something and you want to show them the page, or go to a specific site.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: 'The full URL to open, including https://. For example: https://www.google.com',
        },
      },
      required: ['url'],
    },
  },
];
