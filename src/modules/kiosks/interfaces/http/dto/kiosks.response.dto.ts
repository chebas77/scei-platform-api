import { ApiProperty } from '@nestjs/swagger';

export class KioskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['active', 'inactive'] }) status: 'active' | 'inactive';
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
