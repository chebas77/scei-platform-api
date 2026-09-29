import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { ApiModule, RequirePermission } from '../../../../shared/security/decorators';
import { MetricsService } from '../../application/metrics.service';
import { PlatformOverviewResponseDto, TenantHealthResponseDto } from './dto/tenants.response.dto';
import { TenantsHttpMapper } from './tenants-http.mapper';

@ApiModule({ key: 'metrics', name: 'Métricas de plataforma', description: 'Métricas agregadas por colegio, sin datos personales.', scope: 'platform' })
@Controller('platform/metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @RequirePermission('metrics:read', 'Consultar métricas agregadas de la plataforma')
  @Get('overview')
  @ApiOperation({ summary: 'PL-05 · Resumen de la plataforma (colegios por estado, totales, cercanos al límite)' })
  @ApiOkResponse({ type: PlatformOverviewResponseDto })
  @ApiErrorResponses(ErrorCodes.RBAC_FORBIDDEN)
  async overview(): Promise<PlatformOverviewResponseDto> {
    return TenantsHttpMapper.toOverview(await this.metrics.overview());
  }

  @RequirePermission('metrics:read', 'Consultar métricas agregadas de la plataforma')
  @Get('tenants/:id')
  @ApiOperation({ summary: 'PL-05 · Salud de un colegio: uso vs. límites, latencia, cola y errores' })
  @ApiOkResponse({ type: TenantHealthResponseDto })
  @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.RBAC_FORBIDDEN)
  async tenant(@Param('id', ParseUUIDPipe) id: string): Promise<TenantHealthResponseDto> {
    return TenantsHttpMapper.toHealth(await this.metrics.tenantHealth(id));
  }
}
