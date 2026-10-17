import { departmentPalette } from '../brand/tokens';
import type { Department } from '../types';

export type SeedDepartment = Pick<Department, 'id' | 'name' | 'code' | 'description' | 'color' | 'order'>;

export const SEED_DEPARTMENTS: SeedDepartment[] = [
  {
    id: 'computing',
    name: 'College of Computing and Information Technology',
    code: 'CCIT',
    description: 'Computer Science and Information Technology programs.',
    color: departmentPalette[0],
    order: 1,
  },
  {
    id: 'engineering',
    name: 'College of Engineering',
    code: 'COE',
    description: 'Civil, Mechanical and Electrical Engineering programs.',
    color: departmentPalette[1],
    order: 2,
  },
  {
    id: 'business',
    name: 'College of Business and Accountancy',
    code: 'CBA',
    description: 'Business Administration, Accountancy and Management Accounting programs.',
    color: departmentPalette[2],
    order: 3,
  },
  {
    id: 'hospitality_tourism',
    name: 'College of Hospitality and Tourism Management',
    code: 'CHTM',
    description: 'Hospitality Management and Tourism Management programs.',
    color: departmentPalette[3],
    order: 4,
  },
  {
    id: 'arts_sciences',
    name: 'College of Arts and Sciences',
    code: 'CAS',
    description: 'Communication, Psychology, English Language and Mathematics programs.',
    color: departmentPalette[4],
    order: 5,
  },
  {
    id: 'education',
    name: 'College of Education',
    code: 'COED',
    description: 'Physical, Early Childhood, Elementary and Secondary Education programs.',
    color: departmentPalette[5],
    order: 6,
  },
  {
    id: 'criminal_justice',
    name: 'College of Criminal Justice Education',
    code: 'CCJE',
    description: 'Criminology program.',
    color: departmentPalette[6],
    order: 7,
  },
];

/** Which department each of the 21 seeded programs belongs to. */
export const PROGRAM_DEPARTMENT_MAP: Record<string, string> = {
  computer_science: 'computing',
  it: 'computing',
  civil_engineering: 'engineering',
  mechanical_engineering: 'engineering',
  electrical_engineering: 'engineering',
  business_financial_management: 'business',
  business_marketing_management: 'business',
  accountancy: 'business',
  management_accounting: 'business',
  hospitality: 'hospitality_tourism',
  tourism_management: 'hospitality_tourism',
  communication: 'arts_sciences',
  psychology: 'arts_sciences',
  english_language: 'arts_sciences',
  mathematics: 'arts_sciences',
  physical_education: 'education',
  early_childhood_education: 'education',
  elementary_education: 'education',
  secondary_education_english: 'education',
  secondary_education_filipino: 'education',
  criminal_justice: 'criminal_justice',
};
