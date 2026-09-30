import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext, TenantAuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, CurrentTenant, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { AcademicStructureService } from '../../application/academic-structure.service';
import { EnrollmentService } from '../../application/enrollment.service';
import {
  CreateAcademicYearRequestDto, CreateEnrollmentRequestDto, CreateGradeLevelRequestDto, CreateSectionRequestDto, TransferEnrollmentRequestDto,
} from './dto/academics.request.dto';
import { AcademicYearResponseDto, EnrollmentResponseDto, GradeLevelResponseDto, SectionResponseDto } from './dto/academics.response.dto';
import { AcademicsHttpMapper } from './academics-http.mapper';

/** Ámbito COLEGIO: exige `X-Tenant-Slug`, ya verificado (dos veces) por el guard global. */
@ApiModule({ key: 'academics', name: 'Estructura académica', description: 'Ciclos escolares, grados, secciones y matrícula.', scope: 'tenant' })
@Controller('tenant/academics')
export class AcademicsController {
  constructor(
    private readonly structure: AcademicStructureService,
    private readonly enrollments: EnrollmentService,
  ) {}

  // ── Ciclos escolares ─────────────────────────────────────────────────
  @RequirePermission('academics:read', 'Consultar la estructura académica del colegio')
  @Get('years')
  @ApiOperation({ summary: 'Listar ciclos escolares' })
  @ApiOkResponse({ type: [AcademicYearResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async listYears(@CurrentTenant() tenant: TenantAuthContext): Promise<AcademicYearResponseDto[]> {
    return (await this.structure.listYears(tenant.id)).map(AcademicsHttpMapper.toYear);
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('years')
  @ApiOperation({ summary: 'Abrir un ciclo escolar' })
  @ApiCreatedResponse({ type: AcademicYearResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_YEAR_TAKEN, ErrorCodes.RBAC_FORBIDDEN)
  async createYear(
    @Body() body: CreateAcademicYearRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<AcademicYearResponseDto> {
    return AcademicsHttpMapper.toYear(await this.structure.createYear(tenant.id, body.year, auth.userId, meta));
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('years/:id/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar un ciclo escolar' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  @ApiErrorResponses(ErrorCodes.ACA_YEAR_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async closeYear(
    @Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<AcademicYearResponseDto> {
    return AcademicsHttpMapper.toYear(await this.structure.closeYear(tenant.id, id, auth.userId, meta));
  }

  // ── Grados ───────────────────────────────────────────────────────────
  @RequirePermission('academics:read', 'Consultar la estructura académica del colegio')
  @Get('grades')
  @ApiOperation({ summary: 'Listar grados (catálogo fijo del colegio)' })
  @ApiOkResponse({ type: [GradeLevelResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async listGrades(@CurrentTenant() tenant: TenantAuthContext): Promise<GradeLevelResponseDto[]> {
    return (await this.structure.listGrades(tenant.id)).map(AcademicsHttpMapper.toGrade);
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('grades')
  @ApiOperation({ summary: 'Crear un grado' })
  @ApiCreatedResponse({ type: GradeLevelResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_GRADE_TAKEN, ErrorCodes.RBAC_FORBIDDEN)
  async createGrade(
    @Body() body: CreateGradeLevelRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<GradeLevelResponseDto> {
    return AcademicsHttpMapper.toGrade(await this.structure.createGrade(tenant.id, body, auth.userId, meta));
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Delete('grades/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar un grado sin secciones' })
  @ApiNoContentResponse({ description: 'Grado borrado.' })
  @ApiErrorResponses(ErrorCodes.ACA_GRADE_NOT_FOUND, ErrorCodes.ACA_GRADE_IN_USE, ErrorCodes.RBAC_FORBIDDEN)
  async deleteGrade(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.structure.deleteGrade(tenant.id, id, auth.userId, meta);
  }

  // ── Secciones ────────────────────────────────────────────────────────
  @RequirePermission('academics:read', 'Consultar la estructura académica del colegio')
  @Get('sections')
  @ApiOperation({ summary: 'Listar secciones de un ciclo escolar' })
  @ApiOkResponse({ type: [SectionResponseDto] })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_YEAR_NOT_FOUND, ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async listSections(@Query('academicYearId', ParseUUIDPipe) academicYearId: string, @CurrentTenant() tenant: TenantAuthContext): Promise<SectionResponseDto[]> {
    return (await this.structure.listSections(tenant.id, academicYearId)).map(AcademicsHttpMapper.toSection);
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('sections')
  @ApiOperation({ summary: 'Crear una sección (instancia de un grado en un ciclo escolar)' })
  @ApiCreatedResponse({ type: SectionResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_YEAR_NOT_FOUND, ErrorCodes.ACA_GRADE_NOT_FOUND, ErrorCodes.ACA_SECTION_TAKEN, ErrorCodes.RBAC_FORBIDDEN)
  async createSection(
    @Body() body: CreateSectionRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<SectionResponseDto> {
    return AcademicsHttpMapper.toSection(await this.structure.createSection(tenant.id, body, auth.userId, meta));
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Delete('sections/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar una sección sin alumnos matriculados' })
  @ApiNoContentResponse({ description: 'Sección borrada.' })
  @ApiErrorResponses(ErrorCodes.ACA_SECTION_NOT_FOUND, ErrorCodes.ACA_SECTION_HAS_ENROLLMENTS, ErrorCodes.RBAC_FORBIDDEN)
  async deleteSection(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.structure.deleteSection(tenant.id, id, auth.userId, meta);
  }

  // ── Matrícula ────────────────────────────────────────────────────────
  @RequirePermission('academics:read', 'Consultar la estructura académica del colegio')
  @Get('sections/:sectionId/enrollments')
  @ApiOperation({ summary: 'Listar los alumnos matriculados en una sección' })
  @ApiOkResponse({ type: [EnrollmentResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async listEnrollments(@Param('sectionId', ParseUUIDPipe) sectionId: string): Promise<EnrollmentResponseDto[]> {
    return (await this.enrollments.listBySection(sectionId)).map(AcademicsHttpMapper.toEnrollment);
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('enrollments')
  @ApiOperation({ summary: 'Matricular a un alumno en una sección' })
  @ApiCreatedResponse({ type: EnrollmentResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_SECTION_NOT_FOUND, ErrorCodes.STU_NOT_FOUND, ErrorCodes.ACA_ALREADY_ENROLLED, ErrorCodes.RBAC_FORBIDDEN)
  async enroll(
    @Body() body: CreateEnrollmentRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<EnrollmentResponseDto> {
    return AcademicsHttpMapper.toEnrollment(await this.enrollments.enroll(tenant.id, body, auth.userId, meta));
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Put('enrollments/:id/section')
  @ApiOperation({ summary: 'Trasladar al alumno a otra sección del mismo ciclo escolar' })
  @ApiOkResponse({ type: EnrollmentResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.ACA_ENROLLMENT_NOT_FOUND, ErrorCodes.ACA_SECTION_NOT_FOUND, ErrorCodes.ACA_SCOPE_MISMATCH, ErrorCodes.RBAC_FORBIDDEN)
  async transfer(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: TransferEnrollmentRequestDto,
    @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<EnrollmentResponseDto> {
    return AcademicsHttpMapper.toEnrollment(await this.enrollments.transfer(tenant.id, id, body.sectionId, auth.userId, meta));
  }

  @RequirePermission('academics:manage', 'Crear y editar ciclos escolares, grados y secciones')
  @Post('enrollments/:id/withdraw')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retirar a un alumno de su matrícula (no lo elimina, solo la marca retirada)' })
  @ApiNoContentResponse({ description: 'Matrícula retirada.' })
  @ApiErrorResponses(ErrorCodes.ACA_ENROLLMENT_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.enrollments.withdraw(tenant.id, id, auth.userId, meta);
  }
}
