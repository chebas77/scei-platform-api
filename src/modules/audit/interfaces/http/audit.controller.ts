import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiModule, RequirePermission } from '../../../../shared/security/decorators';
import { ListAuditLogsUseCase } from '../../application/list-audit-logs.use-case';
import { VerifyAuditChainUseCase } from '../../application/verify-audit-chain.use-case';
import { AuditHttpMapper } from './audit-http.mapper';
import { AuditLogPageResponseDto, ChainVerificationResponseDto } from './dto/audit-log.response.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';

@ApiModule({ key: 'audit', name: 'Auditoría', description: 'Bitácora inmutable de acciones', scope: 'platform' })
@Controller('platform/audit-logs')
export class AuditController {
  constructor(
    private readonly listLogs: ListAuditLogsUseCase,
    private readonly verifyChain: VerifyAuditChainUseCase,
  ) {}

  @Get()
  @RequirePermission('audit:read', 'Consultar la bitácora de auditoría')
  @ApiOperation({ summary: 'PL-06 · Listar la bitácora (solo lectura)' })
  @ApiOkResponse({ type: AuditLogPageResponseDto })
  @ApiErrorResponses(ErrorCodes.AUD_INVALID_RANGE, ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.AUTH_TOKEN_INVALID, ErrorCodes.RBAC_FORBIDDEN)
  async list(@Query() query: ListAuditLogsQueryDto): Promise<AuditLogPageResponseDto> {
    const { page, pageSize, ...filter } = query;
    return AuditHttpMapper.toPage(await this.listLogs.execute(filter, page, pageSize));
  }

  @Get('verify-chain')
  @RequirePermission('audit:verify', 'Verificar la integridad de la cadena de auditoría')
  @ApiOperation({ summary: 'PL-06 · Verificar que la cadena de hashes no fue alterada' })
  @ApiOkResponse({ type: ChainVerificationResponseDto })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID, ErrorCodes.RBAC_FORBIDDEN)
  verify(): Promise<ChainVerificationResponseDto> {
    return this.verifyChain.execute();
  }
}
