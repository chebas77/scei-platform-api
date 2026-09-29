import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../../shared/contracts/tenant.contracts';
import { AppException } from '../../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, AuthenticatedOnly, CurrentAuth, ReqMeta, RequirePermission, TENANT_HEADER } from '../../../../shared/security/decorators';
import { RbacAccessService } from '../../application/rbac-access.service';
import { RoleManagementService } from '../../application/role-management.service';
import {
  CreateRoleRequestDto, ListRolesQueryDto, SetRoleModulesRequestDto, SetRolePermissionsRequestDto, UpdateRoleRequestDto,
} from './dto/rbac.request.dto';
import { ModuleResponseDto, MyPermissionsResponseDto, RoleDetailResponseDto, RoleResponseDto, RoleSummaryResponseDto } from './dto/rbac.response.dto';
import { RbacHttpMapper } from './rbac-http.mapper';

@ApiModule({ key: 'rbac', name: 'Roles y permisos', description: 'Catálogo de módulos/APIs y administración de roles.', scope: 'platform' })
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly management: RoleManagementService,
    private readonly access: RbacAccessService,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
  ) {}

  @AuthenticatedOnly()
  @Get('me/permissions')
  @ApiOperation({
    summary: 'Permisos efectivos de la sesión actual. Sin header: ámbito plataforma. Con `X-Tenant-Slug`: ámbito de ese colegio (si el usuario pertenece a él).',
  })
  @ApiOkResponse({ type: MyPermissionsResponseDto })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID, ErrorCodes.RBAC_FORBIDDEN)
  async myPermissions(@CurrentAuth() auth: AuthContext, @Headers(TENANT_HEADER) tenantSlug?: string): Promise<MyPermissionsResponseDto> {
    if (!tenantSlug) {
      const set = await this.access.resolve(auth.userId, null);
      return { permissions: [...set].sort(), tenant: null };
    }
    // Mismos dos chequeos independientes que el guard: colegio activo real + membresía activa real.
    const tenant = await this.tenants.findBySlug(tenantSlug);
    if (!tenant || tenant.status !== 'active' || !(await this.access.hasActiveMembership(auth.userId, tenant.id))) {
      throw new AppException(ErrorCodes.RBAC_FORBIDDEN);
    }
    const set = await this.access.resolve(auth.userId, tenant.id);
    return { permissions: [...set].sort(), tenant: { id: tenant.id, slug: tenant.slug, legalName: tenant.legalName } };
  }

  @RequirePermission('rbac:read', 'Consultar módulos, APIs y roles')
  @Get('modules')
  @ApiOperation({ summary: 'Catálogo de módulos con las APIs (endpoints) que protege cada permiso' })
  @ApiOkResponse({ type: [ModuleResponseDto] })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID, ErrorCodes.RBAC_FORBIDDEN)
  async modules(): Promise<ModuleResponseDto[]> {
    return (await this.management.listModules()).map(RbacHttpMapper.toModule);
  }

  @RequirePermission('rbac:read', 'Consultar módulos, APIs y roles')
  @Get('roles')
  @ApiOperation({ summary: 'Listar roles' })
  @ApiOkResponse({ type: [RoleSummaryResponseDto] })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_FORBIDDEN)
  async roles(@Query() query: ListRolesQueryDto): Promise<RoleSummaryResponseDto[]> {
    return (await this.management.listRoles(query.scope)).map(RbacHttpMapper.toRoleSummary);
  }

  @RequirePermission('rbac:read', 'Consultar módulos, APIs y roles')
  @Get('roles/:id')
  @ApiOperation({ summary: 'Detalle de un rol con sus módulos y permisos efectivos' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiErrorResponses(ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async role(@Param('id', ParseUUIDPipe) id: string): Promise<RoleDetailResponseDto> {
    return RbacHttpMapper.toRoleDetail(await this.management.getRole(id));
  }

  @RequirePermission('rbac:manage', 'Crear, editar y eliminar roles y asignarles módulos')
  @Post('roles')
  @ApiOperation({ summary: 'Crear un rol (sin módulos; se asignan después)' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_ROLE_CODE_TAKEN, ErrorCodes.RBAC_FORBIDDEN)
  async create(@Body() body: CreateRoleRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<RoleResponseDto> {
    const role = await this.management.createRole({ ...body, requiresMfa: body.requiresMfa ?? true }, auth.userId, meta);
    return RbacHttpMapper.toRole(role);
  }

  @RequirePermission('rbac:manage', 'Crear, editar y eliminar roles y asignarles módulos')
  @Patch('roles/:id')
  @ApiOperation({ summary: 'Editar nombre, descripción o exigencia de MFA de un rol' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_ROLE_SYSTEM_PROTECTED, ErrorCodes.RBAC_FORBIDDEN)
  async update(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateRoleRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<RoleResponseDto> {
    return RbacHttpMapper.toRole(await this.management.updateRole(id, body, auth.userId, meta));
  }

  @RequirePermission('rbac:manage', 'Crear, editar y eliminar roles y asignarles módulos')
  @Delete('roles/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un rol que no esté asignado a nadie' })
  @ApiNoContentResponse({ description: 'Rol eliminado.' })
  @ApiErrorResponses(ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_ROLE_SYSTEM_PROTECTED, ErrorCodes.RBAC_ROLE_IN_USE, ErrorCodes.RBAC_FORBIDDEN)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.management.deleteRole(id, auth.userId, meta);
  }

  @RequirePermission('rbac:manage', 'Crear, editar y eliminar roles y asignarles módulos')
  @Put('roles/:id/modules')
  @ApiOperation({ summary: 'Asignar módulos a un rol (reemplaza la lista): el rol recibe todas las APIs de cada módulo' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_MODULE_NOT_FOUND, ErrorCodes.RBAC_SCOPE_MISMATCH,
    ErrorCodes.RBAC_ROLE_LOCKED, ErrorCodes.RBAC_ROLE_SYSTEM_PROTECTED, ErrorCodes.RBAC_FORBIDDEN,
  )
  async setModules(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: SetRoleModulesRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<RoleDetailResponseDto> {
    return RbacHttpMapper.toRoleDetail(await this.management.setModules(id, body.moduleIds, auth.userId, meta));
  }

  @RequirePermission('rbac:manage', 'Crear, editar y eliminar roles y asignarles módulos')
  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Asignar permisos individuales (APIs sueltas) a un rol (reemplaza la lista)' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_PERMISSION_NOT_FOUND, ErrorCodes.RBAC_SCOPE_MISMATCH,
    ErrorCodes.RBAC_ROLE_LOCKED, ErrorCodes.RBAC_ROLE_SYSTEM_PROTECTED, ErrorCodes.RBAC_FORBIDDEN,
  )
  async setPermissions(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: SetRolePermissionsRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<RoleDetailResponseDto> {
    return RbacHttpMapper.toRoleDetail(await this.management.setPermissions(id, body.permissionIds, auth.userId, meta));
  }
}
