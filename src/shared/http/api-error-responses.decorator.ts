import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorDefinition } from '../errors/error-codes';
import { ErrorResponseDto } from '../errors/error-response.dto';

/**
 * Documenta en Swagger los errores que un endpoint puede devolver, agrupados por estado HTTP.
 * Se pasan definiciones del catálogo: así la documentación nunca se desincroniza del código.
 *   @ApiErrorResponses(ErrorCodes.TEN_NOT_FOUND, ErrorCodes.TEN_INVALID_STATE)
 */
export function ApiErrorResponses(...defs: ErrorDefinition[]) {
  const byStatus = new Map<number, ErrorDefinition[]>();
  for (const def of defs) byStatus.set(def.status, [...(byStatus.get(def.status) ?? []), def]);
  return applyDecorators(
    ...[...byStatus.entries()].map(([status, list]) =>
      ApiResponse({
        status,
        type: ErrorResponseDto,
        description: list.map((d) => `\`${d.code}\` — ${d.message}`).join('  \n'),
      }),
    ),
  );
}
