import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiPropertyOptional({ example: 'email', description: 'Campo afectado, cuando aplica.' })
  field?: string;

  @ApiProperty({ example: 'debe ser un correo válido' })
  message: string;
}

/** Forma única de toda respuesta de error de la API. */
export class ErrorResponseDto {
  @ApiProperty({ example: 'TEN-002', description: 'Código estable del catálogo de errores.' })
  code: string;

  @ApiProperty({ example: 'Ya existe un colegio con ese identificador.' })
  message: string;

  @ApiPropertyOptional({ type: [ErrorDetailDto] })
  details?: ErrorDetailDto[];

  @ApiProperty({ example: 'b1c2d3e4-0000-4000-8000-000000000000', description: 'Identificador para rastrear la solicitud en logs.' })
  traceId: string;

  @ApiProperty({ example: '2026-09-28T19:20:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/v1/platform/tenants' })
  path: string;
}
