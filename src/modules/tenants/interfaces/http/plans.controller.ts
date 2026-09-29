import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext } from '../../../../shared/security/auth-context';
import { ApiModule, CurrentAuth, ReqMeta, RequirePermission } from '../../../../shared/security/decorators';
import { PlanService } from '../../application/plan.service';
import { CreatePlanRequestDto, PlanListItemResponseDto, PlanResponseDto, UpdatePlanRequestDto } from './dto/plans.dto';
import { TenantsHttpMapper } from './tenants-http.mapper';

@ApiModule({ key: 'plans', name: 'Planes', description: 'Planes comerciales y sus límites.', scope: 'platform' })
@Controller('platform/plans')
export class PlansController {
  constructor(private readonly plans: PlanService) {}

  @RequirePermission('plans:read', 'Consultar planes')
  @Get()
  @ApiOperation({ summary: 'Listar planes con cuántos colegios los usan' })
  @ApiOkResponse({ type: [PlanListItemResponseDto] })
  @ApiErrorResponses(ErrorCodes.RBAC_FORBIDDEN)
  async list(): Promise<PlanListItemResponseDto[]> {
    return (await this.plans.list()).map(TenantsHttpMapper.toPlanListItem);
  }

  @RequirePermission('plans:manage', 'Crear y editar planes y sus límites')
  @Post()
  @ApiOperation({ summary: 'PL-02 · Crear un plan' })
  @ApiCreatedResponse({ type: PlanResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.PLAN_CODE_TAKEN, ErrorCodes.RBAC_FORBIDDEN)
  async create(@Body() body: CreatePlanRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<PlanResponseDto> {
    return TenantsHttpMapper.toPlan(await this.plans.create(body, auth.userId, meta));
  }

  @RequirePermission('plans:manage', 'Crear y editar planes y sus límites')
  @Patch(':id')
  @ApiOperation({ summary: 'PL-02 · Editar un plan (no puede bajar límites por debajo del uso de sus colegios)' })
  @ApiOkResponse({ type: PlanResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.PLAN_NOT_FOUND, ErrorCodes.PLAN_LIMIT_BELOW_USAGE, ErrorCodes.RBAC_FORBIDDEN)
  async update(
    @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePlanRequestDto, @CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta,
  ): Promise<PlanResponseDto> {
    return TenantsHttpMapper.toPlan(await this.plans.update(id, body, auth.userId, meta));
  }
}
