import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../../shared/contracts/tenant.contracts';
import { AppException } from '../../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { AcceptOperatorInvitationUseCase } from '../../application/accept-operator-invitation.use-case';
import { ChangeUserRoleUseCase } from '../../application/change-user-role.use-case';
import { InviteOperatorUseCase } from '../../application/invite-operator.use-case';
import { ListScopedUsersUseCase } from '../../application/list-scoped-users.use-case';
import { SetUserStatusUseCase } from '../../application/set-user-status.use-case';
import { ChangeUserRoleRequestDto, InviteOperatorRequestDto } from './dto/users.request.dto';
import { InviteOperatorResponseDto, ScopedUserResponseDto } from './dto/users.response.dto';
import { UsersHttpMapper } from './users-http.mapper';
import { Inject } from '@nestjs/common';

@ApiModule({ key: 'users', name: 'Usuarios', description: 'Operadores de plataforma y administradores de colegio: alta por invitación, rol y estado de la cuenta.', scope: 'platform' })
@Controller('platform')
export class UsersController {
  constructor(
    private readonly list: ListScopedUsersUseCase,
    private readonly invite: InviteOperatorUseCase,
    private readonly changeRole: ChangeUserRoleUseCase,
    private readonly setStatus: SetUserStatusUseCase,
    private readonly acceptInvitation: AcceptOperatorInvitationUseCase,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
  ) {}

  @RequirePermission('users:read', 'Consultar operadores de plataforma y administradores de colegio')
  @Get('users')
  @ApiOperation({ summary: 'Listar operadores de plataforma (usuarios sin colegio asociado)' })
  @ApiOkResponse({ type: [ScopedUserResponseDto] })
  @ApiErrorResponses(ErrorCodes.RBAC_FORBIDDEN)
  async listPlatformUsers(): Promise<ScopedUserResponseDto[]> {
    return (await this.list.execute(null)).map(UsersHttpMapper.toScopedUser);
  }

  @RequirePermission('users:read', 'Consultar operadores de plataforma y administradores de colegio')
  @Get('tenants/:tenantId/users')
  @ApiOperation({ summary: 'Listar administradores de un colegio' })
  @ApiOkResponse({ type: [ScopedUserResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async listTenantUsers(@Param('tenantId', ParseUUIDPipe) tenantId: string): Promise<ScopedUserResponseDto[]> {
    if (!(await this.tenants.findBasic(tenantId))) throw new AppException(ErrorCodes.TEN_NOT_FOUND);
    return (await this.list.execute(tenantId)).map(UsersHttpMapper.toScopedUser);
  }

  @RequirePermission('users:manage', 'Invitar, cambiar de rol y habilitar/deshabilitar usuarios')
  @Post('users/invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invitar a un usuario a un rol (envía invitación de un solo uso al correo)' })
  @ApiOkResponse({ type: InviteOperatorResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_SCOPE_MISMATCH, ErrorCodes.TEN_NOT_FOUND,
    ErrorCodes.USR_INVITATION_REDUNDANT, ErrorCodes.RBAC_FORBIDDEN,
  )
  async inviteOperator(
    @Body() body: InviteOperatorRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<InviteOperatorResponseDto> {
    const { expiresAt } = await this.invite.execute({ email: body.email, roleId: body.roleId, tenantId: body.tenantId ?? null }, auth.userId, meta);
    return { expiresAt: expiresAt.toISOString() };
  }

  @RequirePermission('users:manage', 'Invitar, cambiar de rol y habilitar/deshabilitar usuarios')
  @Put('users/:id/role')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cambiar el rol de un usuario dentro de un ámbito' })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.USR_NOT_FOUND, ErrorCodes.RBAC_ROLE_NOT_FOUND, ErrorCodes.RBAC_SCOPE_MISMATCH, ErrorCodes.USR_LAST_PLATFORM_ADMIN,
    ErrorCodes.RBAC_FORBIDDEN,
  )
  async changeUserRole(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: ChangeUserRoleRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<void> {
    await this.changeRole.execute({ userId: id, tenantId: body.tenantId ?? null, roleId: body.roleId }, auth.userId, meta);
  }

  @RequirePermission('users:manage', 'Invitar, cambiar de rol y habilitar/deshabilitar usuarios')
  @Post('users/:id/disable')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deshabilitar una cuenta (invalida sus sesiones activas)' })
  @ApiErrorResponses(ErrorCodes.USR_NOT_FOUND, ErrorCodes.USR_LAST_PLATFORM_ADMIN, ErrorCodes.RBAC_FORBIDDEN)
  async disable(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.setStatus.execute(id, 'disabled', auth.userId, meta);
  }

  @RequirePermission('users:manage', 'Invitar, cambiar de rol y habilitar/deshabilitar usuarios')
  @Post('users/:id/enable')
  @HttpCode(204)
  @ApiOperation({ summary: 'Rehabilitar una cuenta deshabilitada' })
  @ApiErrorResponses(ErrorCodes.USR_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async enable(@Param('id', ParseUUIDPipe) id: string, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.setStatus.execute(id, 'active', auth.userId, meta);
  }
}
