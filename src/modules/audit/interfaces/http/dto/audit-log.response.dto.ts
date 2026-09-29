import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageResponseDto } from '../../../../../shared/http/pagination';

/** Salida: lo que la API expone de un registro (no incluye `prevHash` ni datos internos). */
export class AuditLogResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  actorUserId: string | null;

  @ApiProperty({ enum: ['user', 'system'] })
  actorType: string;

  @ApiProperty({ example: 'tenant.created' })
  action: string;

  @ApiProperty({ enum: ['success', 'denied', 'failure'] })
  outcome: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'tenant' })
  resourceType: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  resourceId: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  tenantId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  ip: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  requestId: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata: Record<string, unknown>;

  @ApiProperty({ description: 'Hash del eslabón; permite verificar la cadena.' })
  hash: string;
}

export class AuditLogPageResponseDto extends PageResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];
}

export class ChainVerificationResponseDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 1280, description: 'Registros verificados antes de terminar o de encontrar una ruptura.' })
  checked: number;

  @ApiProperty({ nullable: true, type: Number, example: null, description: 'Primer id alterado, si la cadena está rota.' })
  firstBrokenId: number | null;
}
