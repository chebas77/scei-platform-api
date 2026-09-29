import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext, TenantAuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, CurrentTenant, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { KioskService } from '../../application/kiosk.service';
import { CreateKioskRequestDto, UpdateKioskRequestDto } from './dto/kiosks.request.dto';
import { KioskResponseDto } from './dto/kiosks.response.dto';
import { KiosksHttpMapper } from './kiosks-http.mapper';

/**
 * Ámbito COLEGIO: toda solicitud debe traer el header `X-Tenant-Slug`. El guard global ya verificó
 * (dos veces, de forma independiente) que quien llama pertenece a ese colegio; aquí solo se usa el id resuelto.
 */
@ApiModule({ key: 'kiosks', name: 'Kioscos', description: 'Terminales físicos del colegio (asistencia/cafetería).', scope: 'tenant' })
@Controller('tenant/kiosks')
export class KiosksController {
  constructor(private readonly kiosks: KioskService) {}

  @RequirePermission('kiosks:read', 'Consultar los kioscos del colegio')
  @Get()
  @ApiOperation({ summary: 'Listar los kioscos del colegio' })
  @ApiOkResponse({ type: [KioskResponseDto] })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.RBAC_FORBIDDEN)
  async list(@CurrentTenant() tenant: TenantAuthContext): Promise<KioskResponseDto[]> {
    return (await this.kiosks.list(tenant.id)).map(KiosksHttpMapper.toKiosk);
  }

  @RequirePermission('kiosks:manage', 'Dar de alta, editar y borrar kioscos del colegio')
  @Post()
  @ApiOperation({ summary: 'Dar de alta un kiosco (rechaza si el colegio ya alcanzó el máximo de su plan)' })
  @ApiCreatedResponse({ type: KioskResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.KIO_CODE_TAKEN, ErrorCodes.KIO_LIMIT_REACHED, ErrorCodes.RBAC_FORBIDDEN)
  async create(
    @Body() body: CreateKioskRequestDto, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<KioskResponseDto> {
    return KiosksHttpMapper.toKiosk(await this.kiosks.create(tenant.id, body, auth.userId, meta));
  }

  @RequirePermission('kiosks:manage', 'Dar de alta, editar y borrar kioscos del colegio')
  @Patch(':id')
  @ApiOperation({ summary: 'Editar nombre o estado de un kiosco' })
  @ApiOkResponse({ type: KioskResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.KIO_NOT_FOUND, ErrorCodes.KIO_LIMIT_REACHED, ErrorCodes.RBAC_FORBIDDEN)
  async update(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateKioskRequestDto,
    @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<KioskResponseDto> {
    return KiosksHttpMapper.toKiosk(await this.kiosks.update(tenant.id, id, body, auth.userId, meta));
  }

  @RequirePermission('kiosks:manage', 'Dar de alta, editar y borrar kioscos del colegio')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar un kiosco' })
  @ApiNoContentResponse({ description: 'Kiosco borrado.' })
  @ApiErrorResponses(ErrorCodes.TEN_CONTEXT_REQUIRED, ErrorCodes.KIO_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantAuthContext, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<void> {
    await this.kiosks.remove(tenant.id, id, auth.userId, meta);
  }
}
