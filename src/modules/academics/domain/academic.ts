export interface AcademicYear {
  id: string;
  tenantId: string;
  year: number;
  status: 'active' | 'closed';
  createdAt: Date;
}

export interface GradeLevel {
  id: string;
  tenantId: string;
  name: string;
  order: number;
}

export interface Section {
  id: string;
  tenantId: string;
  academicYearId: string;
  gradeLevelId: string;
  name: string;
}

export interface Enrollment {
  id: string;
  tenantId: string;
  academicYearId: string;
  sectionId: string;
  studentId: string;
  status: 'active' | 'withdrawn';
  createdAt: Date;
}
