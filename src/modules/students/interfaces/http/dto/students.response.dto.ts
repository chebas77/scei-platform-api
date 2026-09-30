import { ApiProperty } from '@nestjs/swagger';

export class StudentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['active', 'inactive'] }) status: 'active' | 'inactive';
  @ApiProperty() createdAt: string;
}
