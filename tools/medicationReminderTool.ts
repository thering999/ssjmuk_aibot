import { FunctionDeclaration, Type } from '@google/genai';

export const medicationReminderTool: FunctionDeclaration = {
  name: 'setMedicationReminder',
  description: 'Sets a reminder for the user to take their medication at a specific time. Use this when the user asks to be reminded about their medicine.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      time: {
        type: Type.STRING,
        description: 'The time for the reminder, e.g., "8:00 AM", "in 15 minutes", "tomorrow at 9 PM".',
      },
      medication: {
        type: Type.STRING,
        description: 'The name of the medication or a general description, e.g., "paracetamol", "my allergy pill". Defaults to "your medication" if not specified.',
      },
    },
    required: ['time'],
  },
};