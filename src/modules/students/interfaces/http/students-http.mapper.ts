import { Student } from '../../domain/student';
import { StudentResponseDto } from './dto/students.response.dto';

export const StudentsHttpMapper = {
  toStudent(s: Student): StudentResponseDto {
    return { id: s.id, code: s.code, fullName: s.fullName, email: s.email, status: s.status, createdAt: s.createdAt.toISOString() };
  },
};
