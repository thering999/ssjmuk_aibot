import { FunctionDeclaration, Type } from '@google/genai';

export const clinicFinderTool: FunctionDeclaration = {
  name: 'getClinicInfo',
  description: 'ค้นหาข้อมูลเกี่ยวกับสถานพยาบาล คลินิก หรือโรงพยาบาลในจังหวัดมุกดาหาร เช่น เวลาทำการ, ที่อยู่, หรือบริการที่มี',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: 'ชื่อตำบล, อำเภอ, หรือชื่อเฉพาะของสถานที่ที่ต้องการค้นหา เช่น "คำอาฮวน" หรือ "ดอนตาล"',
      },
    },
    required: ['location'],
  },
};
