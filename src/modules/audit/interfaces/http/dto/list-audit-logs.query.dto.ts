import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../../../shared/http/pagination';

/** Entrada: filtros de consulta de la bitácora. */
export class ListAuditLogsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Desde (inclusive).' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Hasta (inclusive).' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ example: 'tenant.created' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ enum: ['success', 'denied', 'failure'] })
  @IsOptional()
  @IsIn(['success', 'denied', 'failure'])
  outcome?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ example: 'tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  resourceType?: string;
}
