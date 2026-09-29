import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateKioskRequestDto {
  @ApiProperty({ example: 'entrada-principal', description: 'Identificador del dispositivo, único en el colegio.' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_-]{1,59}$/, { message: 'code usa minúsculas, números, guion y guion bajo' })
  code: string;

  @ApiProperty({ example: 'Kiosco entrada principal' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

export class UpdateKioskRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional({ enum: ['active', 'inactive'] }) @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
