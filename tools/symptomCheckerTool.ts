import { FunctionDeclaration, Type } from '@google/genai';

export const symptomCheckerTool: FunctionDeclaration = {
  name: 'checkSymptoms',
  description: 'Analyzes user-described health symptoms to provide potential causes and general advice. Use this when a user lists symptoms like "headache", "fever", "cough", etc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      symptoms: {
        type: Type.ARRAY,
        description: 'A list of symptoms the user has mentioned. e.g., ["headache", "fever"]',
        items: { type: Type.STRING }
      },
      severity: {
        type: Type.STRING,
        description: 'The severity of the symptoms as described by the user. Must be one of: Mild, Moderate, Severe. Default to "Mild" if not specified.',
        enum: ['Mild', 'Moderate', 'Severe']
      }
    },
    required: ['symptoms', 'severity'],
  },
};