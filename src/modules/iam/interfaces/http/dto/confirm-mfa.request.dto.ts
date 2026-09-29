import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ConfirmMfaRequestDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code debe tener 6 dígitos' })
  code: string;
}
