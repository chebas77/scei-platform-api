import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../../shared/clock/clock.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { CreateTenantUseCase } from '../../application/create-tenant.use-case';
import { ResendInvitationUseCase } from '../../application/resend-invitation.use-case';
import { TenantLifecycleService } from '../../application/tenant-lifecycle.service';
import { TenantQueryService } from '../../application/tenant-query.service';
import {
  AssignPlanRequestDto, CreateTenantRequestDto, ListTenantsQueryDto, PurgeTenantRequestDto, ResendInvitationRequestDto, SuspendTenantRequestDto,
} from './dto/tenants.request.dto';
import {
  CreateTenantResponseDto, DeletionCertificateResponseDto, ResendInvitationResponseDto, TenantDetailResponseDto, TenantPageResponseDto, TenantResponseDto,
} from './dto/tenants.response.dto';
import { TenantsHttpMapper } from './tenants-http.mapper';
import { Inject } from '@nestjs/common';

@ApiModule({ key: 'tenants', name: 'Colegios', description: 'Alta, plan, suspensión y baja de colegios (tenants).', scope: 'platform' })
@Controller('platform/tenants')
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly resendInvitation: ResendInvitationUseCase,
    private readonly lifecycle: TenantLifecycleService,
    private readonly queries: TenantQueryService,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  @RequirePermission('tenants:create', 'Dar de alta un colegio e invitar a su administrador')
  @Post()
  @ApiOperation({ summary: 'PL-01 · Dar de alta un colegio (envía invitación de un solo uso al administrador)' })
  @ApiCreatedResponse({ type: CreateTenantResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_SLUG_TAKEN, ErrorCodes.TEN_RUC_TAKEN, ErrorCodes.PLAN_NOT_FOUND, ErrorCodes.PLAN_INACTIVE, ErrorCodes.RBAC_FORBIDDEN,
  )
  async create(@Body() body: CreateTenantRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<CreateTenantResponseDto> {
    const { tenant, invitationExpiresAt } = await this.createTenant.execute(body, auth.userId, meta);
    return { id: tenant.id, slug: tenant.slug, status: tenant.status, invitationExpiresAt: invitationExpiresAt.toISOString() };
  }

  @RequirePermission('tenants:read', 'Consultar colegios')
  @Get()
  @ApiOperation({ summary: 'Listar colegios' })
  @ApiOkResponse({ type: TenantPageResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_FORBIDDEN)
  async list(@Query() q: ListTenantsQueryDto): Promise<TenantPageResponseDto> {
    const page = await this.queries.list(q);
    return { page: page.page, pageSize: page.pageSize, total: page.total, items: page.items.map(TenantsHttpMapper.toTenant) };
  }

  @RequirePermission('tenants:read', 'Consultar colegios')
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un colegio con su plan, uso agregado e invitaciones' })
  @ApiOkResponse({ type: TenantDetailResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TenantDetailResponseDto> {
    return TenantsHttpMapper.toTenantDetail(await this.queries.get(id), this.clock.now());
  }

  @RequirePermission('tenants:assign-plan', 'Asignar o cambiar el plan de un colegio')
  @Put(':id/plan')
  @ApiOperation({ summary: 'PL-02 · Asignar plan (la API valida que los límites cubran el uso actual)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.PLAN_NOT_FOUND, ErrorCodes.PLAN_INACTIVE,
    ErrorCodes.PLAN_LIMIT_BELOW_USAGE, ErrorCodes.RBAC_FORBIDDEN,
  )
  async assignPlan(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: AssignPlanRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<TenantResponseDto> {
    await this.lifecycle.assignPlan(id, body.planId, auth.userId, meta);
    return TenantsHttpMapper.toTenant(await this.queries.get(id));
  }

  @RequirePermission('tenants:suspend', 'Suspender y reactivar colegios')
  @Post(':id/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'PL-03 · Suspender un colegio' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.RBAC_FORBIDDEN)
  async suspend(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: SuspendTenantRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<TenantResponseDto> {
    return TenantsHttpMapper.toTenantBare(await this.lifecycle.suspend(id, body.reason, auth.userId, meta));
  }

  @RequirePermission('tenants:suspend', 'Suspender y reactivar colegios')
  @Post(':id/reactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'PL-03 · Reactivar un colegio suspendido' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.RBAC_FORBIDDEN)
  async reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<TenantResponseDto> {
    return TenantsHttpMapper.toTenantBare(await this.lifecycle.reactivate(id, auth.userId, meta));
  }

  @RequirePermission('tenants:create', 'Dar de alta un colegio e invitar a su administrador')
  @Post(':id/invitations/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reenviar la invitación al administrador (revoca las pendientes)' })
  @ApiOkResponse({ type: ResendInvitationResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.RBAC_FORBIDDEN)
  async resend(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: ResendInvitationRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<ResendInvitationResponseDto> {
    const { expiresAt } = await this.resendInvitation.execute(id, body.adminEmail, auth.userId, meta);
    return { expiresAt: expiresAt.toISOString() };
  }

  @RequirePermission('tenants:offboard', 'Solicitar, cancelar y ejecutar la baja de un colegio')
  @Post(':id/offboarding')
  @HttpCode(200)
  @ApiOperation({ summary: 'PL-04 · Solicitar la baja (suspende y abre el periodo de gracia)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.RBAC_FORBIDDEN)
  async requestOffboarding(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<TenantResponseDto> {
    return TenantsHttpMapper.toTenantBare(await this.lifecycle.requestOffboarding(id, auth.userId, meta));
  }

  @RequirePermission('tenants:offboard', 'Solicitar, cancelar y ejecutar la baja de un colegio')
  @Delete(':id/offboarding')
  @HttpCode(200)
  @ApiOperation({ summary: 'PL-04 · Cancelar la baja (el colegio queda suspendido hasta reactivarlo)' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.RBAC_FORBIDDEN)
  async cancelOffboarding(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<TenantResponseDto> {
    return TenantsHttpMapper.toTenantBare(await this.lifecycle.cancelOffboarding(id, auth.userId, meta));
  }

  @RequirePermission('tenants:purge', 'Ejecutar el borrado definitivo de un colegio')
  @Post(':id/purge')
  @HttpCode(200)
  @ApiOperation({ summary: 'PL-04 · Purga definitiva: borra datos, destruye la clave del colegio y emite constancia firmada' })
  @ApiOkResponse({ type: DeletionCertificateResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE, ErrorCodes.TEN_PURGE_CONFIRMATION_MISMATCH,
    ErrorCodes.TEN_PURGE_GRACE_PERIOD, ErrorCodes.RBAC_FORBIDDEN,
  )
  async purge(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: PurgeTenantRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<DeletionCertificateResponseDto> {
    const certificate = await this.lifecycle.purge(id, body.confirmSlug, auth.userId, meta);
    return TenantsHttpMapper.toCertificate(certificate, true);
  }

  @RequirePermission('tenants:read', 'Consultar colegios')
  @Get(':id/deletion-certificate')
  @ApiOperation({ summary: 'Constancia firmada de borrado de un colegio dado de baja' })
  @ApiOkResponse({ type: DeletionCertificateResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_CERTIFICATE_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async certificate(@Param('id', ParseUUIDPipe) id: string): Promise<DeletionCertificateResponseDto> {
    const { certificate, signatureValid } = await this.lifecycle.getCertificate(id);
    return TenantsHttpMapper.toCertificate(certificate, signatureValid);
  }
}
