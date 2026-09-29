import { ApiProperty } from '@nestjs/swagger';

export class ScopedUserResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['active', 'disabled'] }) status: 'active' | 'disabled';
  @ApiProperty() mfaEnabled: boolean;
  @ApiProperty({ nullable: true, type: String }) lastLoginAt: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() roleId: string;
  @ApiProperty() roleCode: string;
  @ApiProperty() roleName: string;
}

export class InviteOperatorResponseDto {
  @ApiProperty() expiresAt: string;
}

export class AcceptOperatorInvitationResponseDto {
  @ApiProperty({ description: 'Falso si el correo ya tenía cuenta (su clave no cambió).' }) accountCreated: boolean;
}
