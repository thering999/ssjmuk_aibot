import type { ClinicInfo } from '../types';

// Mock database
const clinicDatabase: Record<string, ClinicInfo[]> = {
  'ตัวเมืองมุกดาหาร': [
    { name: 'คลินิกหมอครอบครัว รพ.มุกดาหาร', address: 'ถนนพิทักษ์พนมเขต', hours: '08:30-16:30 จ-ศ', services: ['ตรวจโรคทั่วไป', 'วางแผนครอบครัว'], phone: '042-611-729' },
  ],
  'คำอาฮวน': [
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบล คำอาฮวน', address: 'บ้านคำอาฮวน ต.คำอาฮวน', hours: '08:30-16:30 ทุกวัน', services: ['ตรวจโรคทั่วไป', 'ทำแผล', 'จ่ายยาเบื้องต้น'], phone: '042-611-111' },
  ],
  'ดอนตาล': [
     { name: 'โรงพยาบาลดอนตาล', address: 'ต.ดอนตาล อ.ดอนตาล', hours: '24 ชั่วโมง', services: ['ฉุกเฉิน', 'ตรวจโรคทั่วไป', 'คลินิกเบาหวาน'], phone: '042-689-034' },
  ]
};

export const getClinicInfo = async (location: string): Promise<ClinicInfo[] | { error: string }> => {
  console.log(`[Tool Executed] getClinicInfo with location: "${location}"`);
  const results = Object.entries(clinicDatabase)
    .filter(([key]) => location.includes(key))
    .flatMap(([, clinics]) => clinics);
    
  if (results.length > 0) {
    return results;
  }
  
  // A simple fallback search
  const fallbackResults = Object.values(clinicDatabase).flat().filter(clinic => 
    clinic.name.includes(location) || clinic.address.includes(location)
  );

  if (fallbackResults.length > 0) {
    return fallbackResults;
  }

  return { error: `ไม่พบข้อมูลสถานพยาบาลสำหรับ "${location}"` };
};