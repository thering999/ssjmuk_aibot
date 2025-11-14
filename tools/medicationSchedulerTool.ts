import { FunctionDeclaration, Type } from '@google/genai';

export const medicationSchedulerTool: FunctionDeclaration = {
  name: 'scheduleMedication',
  description: 'Schedules a recurring medication reminder for the user. Use this for setting up schedules like "daily", "every 8 hours", etc., for a specific duration.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      medication: {
        type: Type.STRING,
        description: 'The name of the medication to schedule.',
      },
      dosage: {
        type: Type.STRING,
        description: 'The dosage for each reminder, e.g., "1 pill", "10ml".',
      },
      frequency: {
        type: Type.STRING,
        description: 'How often the medication should be taken, e.g., "Daily", "Twice a day", "Every 8 hours".',
      },
      times: {
        type: Type.ARRAY,
        description: 'An array of specific times for the reminders, e.g., ["08:00", "20:00"].',
        items: { type: Type.STRING }
      },
      durationInDays: {
        type: Type.NUMBER,
        description: 'The number of days the schedule should last for. Omit for an ongoing schedule.',
      },
    },
    required: ['medication', 'frequency', 'times'],
  },
};