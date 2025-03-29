import { Prisma } from '@prisma/client';

export interface DepartmentData extends Prisma.DepartmentCreateInput {
  codes: string[];
}

export const departments: DepartmentData[] = [
  { name: 'ส่วนกลาง', code: '00', codes: ['00', '0100'] },
  { name: 'วิศวกรรมโทรคมนาคม', code: '01', codes: ['01', '0101'] },
  { name: 'วิศวกรรมไฟฟ้า', code: '02', codes: ['02', '0102'] },
  { name: 'วิศวกรรมอิเล็กทรอนิกส์', code: '04', codes: ['04', '0104'] },
  { name: 'วิศวกรรมการวัดคุม', code: '06', codes: ['06', '0106'] },
  { name: 'วิศวกรรมเครื่องกล', code: '05', codes: ['05', '0105'] },
  { name: 'วิศวกรรมคอมพิวเตอร์', code: '07', codes: ['07', '0107'] },
  { name: 'วิศวกรรมระบบควบคุม', code: '08', codes: ['08', '0108'] },
  { name: 'วิศวกรรมโยธา', code: '09', codes: ['09', '0109'] },
  { name: 'วิศวกรรมเกษตร', code: '10', codes: ['10', '0110'] },
  { name: 'วิศวกรรมอาหาร', code: '11', codes: ['11', '0111'] },
  { name: 'วิศวกรรมเคมี', code: '12', codes: ['22', '0122'] },
  { name: 'วิศวกรรมคนตรีและสื่อประสม', code: '13', codes: ['13', '0113'] },
  { name: 'วิศวกรรมพลังงานไฟฟ้า', code: '14', codes: ['14', '0114'] },
  { name: 'วิชาเสรีทั่วไป', code: 'GENED', codes: ['901', '902', '903', '904', '905', '906', '966'] },
  { name: 'วิศวกรรมปิโตรเคมี', code: '20', codes: ['20', '0120'] },
  { name: 'วิศวกรรมอุตสาหการ', code: '21', codes: ['21', '0121'] },
  { name: 'วิศวกรรมระบบไอโอทีและสารสนเทศ', code: '23', codes: ['23', '0123'] },
  { name: 'วิศวกรรมแมคคาทรอนิกส์', code: '24', codes: ['24', '0124'] },
  { name: 'วิศวกรรมอัตโนมัติ', code: '25', codes: ['25', '0125'] },
  { name: 'วิศวกรรมนวัตกรรมคอมพิวเตอร์', code: '26', codes: ['26', '0126'] },
  { 

    name: 'วิศวกรรมสหวิทยาการนานาชาติ (SIIE)', 
    code: '01006710', 
    codes: ['01006015', '01006710', '01006717', '01006718', '01006730', '01286111', '01006801', '01006715', '01006813', '01006803', '01006719', '01286222', '01006719', '01006804', '01006723', '01006727'] 
  },
];

export function getDepartmentByCode(code: string): DepartmentData | undefined {
  return departments.find(dept => dept.codes.includes(code));
}