import { ApiProperty } from '@nestjs/swagger';
import { PageResponseDto } from '../../../../../shared/http/pagination';

export class UsageResponseDto {
  @ApiProperty() capturedAt: string;
  @ApiProperty() studentsCount: number;
  @ApiProperty() kiosksCount: number;
  @ApiProperty({ nullable: true, type: Number }) apiP95Ms: number | null;
  @ApiProperty({ nullable: true, type: Number }) queueDepth: number | null;
  @ApiProperty({ nullable: true, type: Number }) errorRate: number | null;
}

export class TenantPlanSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() maxStudents: number;
  @ApiProperty() maxKiosks: number;
}

/** Salida resumida: no incluye quién pidió la baja ni datos internos. */
export class TenantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() legalName: string;
  @ApiProperty({ nullable: true, type: String }) ruc: string | null;
  @ApiProperty({ enum: ['active', 'suspended', 'pending_deletion', 'purged'] }) status: string;
  @ApiProperty({ nullable: true, type: TenantPlanSummaryDto }) plan: TenantPlanSummaryDto | null;
  @ApiProperty({ nullable: true, type: UsageResponseDto }) usage: UsageResponseDto | null;
  @ApiProperty({ nullable: true, type: String }) suspendedAt: string | null;
  @ApiProperty({ nullable: true, type: String }) suspensionReason: string | null;
  @ApiProperty({ nullable: true, type: String }) deletionRequestedAt: string | null;
  @ApiProperty({ nullable: true, type: String }) purgedAt: string | null;
  @ApiProperty() createdAt: string;
}

export class InvitationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Correo enmascarado.', example: 'd***@colegio.pe' }) email: string;
  @ApiProperty({ enum: ['pending', 'accepted', 'expired', 'revoked'] }) state: string;
  @ApiProperty() expiresAt: string;
  @ApiProperty() createdAt: string;
}

export class TenantDetailResponseDto extends TenantResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] }) invitations: InvitationResponseDto[];
}

export class TenantPageResponseDto extends PageResponseDto {
  @ApiProperty({ type: [TenantResponseDto] }) items: TenantResponseDto[];
}

export class CreateTenantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() status: string;
  @ApiProperty({ description: 'Vence la invitación enviada al administrador.' }) invitationExpiresAt: string;
}

export class DeletionCertificateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantSlug: string;
  @ApiProperty() legalName: string;
  @ApiProperty() purgedAt: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload: Record<string, unknown>;
  @ApiProperty({ description: 'HMAC-SHA256 del payload canónico.' }) signature: string;
  @ApiProperty({ description: 'La firma se recalcula al consultar.' }) signatureValid: boolean;
}

export class AcceptInvitationResponseDto {
  @ApiProperty() tenantSlug: string;
  @ApiProperty({ description: 'Falso si el correo ya tenía cuenta (su clave no cambió).' }) accountCreated: boolean;
}

export class ResendInvitationResponseDto {
  @ApiProperty() expiresAt: string;
}

export class PlatformOverviewResponseDto {
  @ApiProperty({ example: { active: 3, suspended: 1, pending_deletion: 0, purged: 2 } }) tenantsByStatus: Record<string, number>;
  @ApiProperty({ example: { students: 4200, kiosks: 12 } }) totals: { students: number; kiosks: number };
  @ApiProperty() tenantsNearLimit: number;
  @ApiProperty() tenantsWithoutRecentData: number;
  @ApiProperty() generatedAt: string;
}

export class TenantHealthResponseDto {
  @ApiProperty() tenantId: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true, type: String }) planCode: string | null;
  @ApiProperty({ nullable: true, type: UsageResponseDto }) usage: UsageResponseDto | null;
  @ApiProperty({ nullable: true, type: Number }) studentsUsagePct: number | null;
  @ApiProperty({ nullable: true, type: Number }) kiosksUsagePct: number | null;
  @ApiProperty() nearLimit: boolean;
  @ApiProperty() stale: boolean;
}
