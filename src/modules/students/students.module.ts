import { Global, Module } from '@nestjs/common';
import { STUDENT_DIRECTORY } from '../../shared/contracts/student.contracts';
import { StudentTenantPurger } from './application/student-tenant-purger';
import { StudentService } from './application/student.service';
import { STUDENT_REPOSITORY } from './domain/ports/student.repository.port';
import { DrizzleStudentRepository } from './infrastructure/persistence/drizzle-student.repository';
import { StudentsController } from './interfaces/http/students.controller';

/** Global: otros módulos (academics, y luego cursos/notas/asistencia) necesitan validar que un alumno existe. */
@Global()
@Module({
  controllers: [StudentsController],
  providers: [
    { provide: STUDENT_REPOSITORY, useClass: DrizzleStudentRepository },
    StudentService,
    { provide: STUDENT_DIRECTORY, useExisting: StudentService },
    StudentTenantPurger,
  ],
  exports: [STUDENT_DIRECTORY],
})
export class StudentsModule {}
