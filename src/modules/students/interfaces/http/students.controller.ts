import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext, TenantAuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, CurrentTenant, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { StudentService } from '../../application/student.service';
import { CreateStudentRequestDto, UpdateStudentRequestDto } from './dto/students.request.dto';
import { StudentResponseDto } from './dto/students.response.dto';
import { StudentsHttpMapper } from './students-http.mapper';

/** Ámbito COLEGIO: exige `X-Tenant-Slug`, ya verificado (dos veces) por el guard global. */
@ApiModule({ key: 'students', name: 'Alumnos', description: 'Perfil académico y cuenta de acceso de los alumnos del colegio.', scope: 'tenant' })
@Controller('tenant/students')
export class StudentsController {
  constructor(private readonly students: StudentService) {}

  @RequirePermission('students:read', 'Consultar los alumnos del colegio')
  @Get()
  @ApiOperation({ summary: 'Listar los alumnos del colegio' })
  @ApiOkResponse({ type: [StudentResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async list(@CurrentTenant() tenant: TenantAuthContext): Promise<StudentResponseDto[]> {
    return (await this.students.list(tenant.id)).map(StudentsHttpMapper.toStudent);
  }

  @RequirePermission('students:manage', 'Dar de alta y editar alumnos')
  @Post()
  @ApiOperation({ summary: 'Dar de alta a un alumno (crea su cuenta de acceso)' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.AUTH_PASSWORD_WEAK, ErrorCodes.STU_CODE_TAKEN, ErrorCodes.STU_LIMIT_REACHED, ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async create(
    @Body() body: CreateStudentRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<StudentResponseDto> {
    return StudentsHttpMapper.toStudent(await this.students.create(tenant.id, body, auth.userId, meta));
  }

  @RequirePermission('students:manage', 'Dar de alta y editar alumnos')
  @Patch(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Editar nombre o estado de un alumno' })
  @ApiNoContentResponse({ description: 'Alumno actualizado.' })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.STU_NOT_FOUND, ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async update(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStudentRequestDto,
    @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<void> {
    await this.students.update(tenant.id, id, body, auth.userId, meta);
  }
}
