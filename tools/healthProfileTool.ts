import { FunctionDeclaration, Type } from '@google/genai';

export const userProfileTool: FunctionDeclaration = {
  name: 'rememberUserDetails',
  description: 'Updates and remembers details about the user for a personalized experience. Use this when the user shares personal information like their name, work, interests, preferences, or health information like allergies, conditions, or medications.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'The user\'s name.',
      },
      work: {
        type: Type.STRING,
        description: 'The user\'s occupation or place of work.',
      },
      interests: {
        type: Type.ARRAY,
        description: 'A list of hobbies or interests the user has.',
        items: { type: Type.STRING }
      },
      preferences: {
        type: Type.ARRAY,
        description: 'A list of preferences the user has mentioned (e.g., "prefers simple explanations", "likes vegetarian food").',
        items: { type: Type.STRING }
      },
      allergies: {
        type: Type.ARRAY,
        description: 'A list of allergies the user has.',
        items: { type: Type.STRING }
      },
      medicalConditions: {
        type: Type.ARRAY,
        description: 'A list of ongoing medical conditions the user has.',
        items: { type: Type.STRING }
      },
      medications: {
        type: Type.ARRAY,
        description: 'A list of medications the user is currently taking.',
        items: { type: Type.STRING }
      },
      healthGoals: {
        type: Type.ARRAY,
        description: 'A list of health goals the user has.',
        items: { type: Type.STRING }
      },
    },
  },
};
