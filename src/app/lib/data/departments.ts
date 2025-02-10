import { Prisma } from '@prisma/client';

export interface DepartmentData extends Prisma.DepartmentCreateInput {
  codes: string[];
}

export const departments: DepartmentData[] = [
  { name: 'ส่วนกลาง', code: '00', codes: ['00'] },
  { name: 'วิศวกรรมโทรคมนาคม', code: '01', codes: ['01'] },
  { name: 'วิศวกรรมไฟฟ้า', code: '02', codes: ['02'] },
  { name: 'วิศวกรรมอิเล็กทรอนิกส์', code: '04', codes: ['04'] },
  { name: 'วิศวกรรมการวัดคุม', code: '06', codes: ['06'] },
  { name: 'วิศวกรรมเครื่องกล', code: '05', codes: ['05'] },
  { name: 'วิศวกรรมคอมพิวเตอร์', code: '07', codes: ['07'] },
  { name: 'วิศวกรรมระบบควบคุม', code: '08', codes: ['08'] },
  { name: 'วิศวกรรมโยธา', code: '09', codes: ['09'] },
  { name: 'วิศวกรรมเกษตร', code: '10', codes: ['10'] },
  { name: 'วิศวกรรมอาหาร', code: '11', codes: ['11'] },
  { name: 'วิศวกรรมเคมี', code: '12', codes: ['12', '22'] },
  { name: 'วิศวกรรมคนตรีและสื่อประสม', code: '13', codes: ['13'] },
  { name: 'วิศวกรรมพลังงานไฟฟ้า', code: '14', codes: ['14'] },
  { name: 'วิชาเสรีทั่วไป', code: '90', codes: ['90'] },
  { name: 'วิศวกรรมปิโตรเคมี', code: '20', codes: ['20'] },
  { name: 'วิศวกรรมอุตสาหการ', code: '21', codes: ['21'] },
  { name: 'วิศวกรรมระบบไอโอทีและสารสนเทศ', code: '23', codes: ['23'] },
  { name: 'วิศวกรรมแมคคาทรอนิกส์', code: '24', codes: ['24'] },
  { name: 'วิศวกรรมอัตโนมัติ', code: '25', codes: ['25'] },
  { name: 'วิศวกรรมนวัตกรรมคอมพิวเตอร์', code: '26', codes: ['26'] },
  { name: 'วิศวกรรมคอมพิวเตอร์(นานาชาติ)', code: '27', codes: ['27'] },
  { name: 'วิศวกรรมซอฟต์แวร์', code: '28', codes: ['28', '1391', '1300'] },
  { name: 'วิศวกรรมไฟฟ้า(นานาชาติ)', code: '30', codes: ['30'] },
  { name: 'วิศวกรรมโยธา(นานาชาติ)', code: '32', codes: ['32'] },
  { name: 'วิศวกรรมไฟฟ้าสื่อสารและอิเล็กทรอนิกส์', code: '34', codes: ['34'] },
  { name: 'วิศวกรรมอุตสาหการ(นานาชาติ)', code: '35', codes: ['35'] },
  { name: 'วิศวกรรมเคมี(นานาชาติ)', code: '36', codes: ['36'] },
  { name: 'วิศวกรรมโยธา(ต่อเนื่อง)', code: '37', codes: ['37'] },
  { name: 'วิศวกรรมเกษตร(ต่อเนื่อง)', code: '38', codes: ['38'] },
  { name: 'วิศวกรรมอวกาศและภูมิสารสนเทศ', code: '40', codes: ['40'] },
  { name: 'วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์', code: '41', codes: ['41'] },
  { name: 'วิศวกรรมเครื่องกล(นานาชาติ)', code: '42', codes: ['42'] },
  { name: 'วิศวกรรมไฟฟ้า(ต่อเนื่อง)', code: '45', codes: ['45'] },
  { name: 'วิศวกรรมพลังงาน', code: '51', codes: ['51'] },
  { name: 'วิศวกรรมการเงิน', code: '52', codes: ['52'] },
  { name: 'วิศวกรรมและการเป็นผู้ประกอบการ', code: '53', codes: ['53'] },
  { name: 'วิศวกรรม-ชีวการแพทย์', code: '92', codes: ['92', '0133'] },
  { name: 'ไม่มีภาควิชา', code: '99', codes: ['99'] }
];

export function getDepartmentByCode(code: string): DepartmentData | undefined {
  return departments.find(dept => dept.codes.includes(code));
}