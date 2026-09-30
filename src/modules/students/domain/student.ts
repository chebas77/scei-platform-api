export type StudentStatus = 'active' | 'inactive';

/** El nombre viaja cifrado (`fullNameEnc`); se descifra en la capa de aplicación con la clave del colegio. */
export interface StudentRecord {
  id: string;
  tenantId: string;
  userId: string;
  code: string;
  fullNameEnc: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string;
  userId: string;
  code: string;
  fullName: string;
  email: string;
  status: StudentStatus;
  createdAt: Date;
}
