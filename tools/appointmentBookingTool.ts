import { FunctionDeclaration, Type } from '@google/genai';

export const appointmentBookingTool: FunctionDeclaration = {
  name: 'bookAppointment',
  description: 'จองนัดหมายกับแพทย์ตามความเชี่ยวชาญ วัน และเวลาที่ผู้ใช้ระบุ',
  parameters: {
    type: Type.OBJECT,
    properties: {
      specialty: {
        type: Type.STRING,
        description: 'แผนกหรือความเชี่ยวชาญของแพทย์ที่ต้องการนัดหมาย เช่น "Cardiology" (โรคหัวใจ), "Dentist" (ทันตกรรม), "Dermatology" (โรคผิวหนัง)',
      },
      date: {
        type: Type.STRING,
        description: 'วันที่ต้องการนัดหมายในรูปแบบ YYYY-MM-DD',
      },
      time: {
        type: Type.STRING,
        description: 'เวลาที่ต้องการนัดหมายในรูปแบบ HH:MM (24-hour format)',
      },
    },
    required: ['specialty', 'date', 'time'],
  },
};
