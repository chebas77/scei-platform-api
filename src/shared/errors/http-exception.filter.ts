import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppException, ErrorDetail } from './app.exception';
import { ErrorCodes, ErrorDefinition } from './error-codes';

/**
 * Filtro global: toda respuesta de error usa `ErrorResponseDto`.
 * - AppException → su código del catálogo.
 * - Errores de Nest/Fastify (404, 413, 429...) → código de sistema equivalente.
 * - Cualquier otra cosa → SYS-500, sin filtrar detalles internos (OWASP A05/A09).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();

    const { definition, details } = this.resolve(exception);
    const traceId = String(request.id ?? '');

    if (definition.status >= 500) {
      const cause = exception instanceof AppException ? (exception.internalCause ?? exception) : exception;
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} -> ${definition.code}`,
        cause instanceof Error ? cause.stack : String(cause),
      );
    }

    void reply
      .status(definition.status)
      .header('Cache-Control', 'no-store')
      .send({
        code: definition.code,
        message: definition.message,
        ...(details && details.length > 0 ? { details } : {}),
        traceId,
        timestamp: new Date().toISOString(),
        path: request.url.split('?')[0],
      });
  }

  private resolve(exception: unknown): { definition: ErrorDefinition; details?: ErrorDetail[] } {
    if (exception instanceof AppException) {
      return { definition: exception.definition, details: exception.details };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 404) return { definition: ErrorCodes.SYS_ROUTE_NOT_FOUND };
      if (status === 413) return { definition: ErrorCodes.SYS_PAYLOAD_TOO_LARGE };
      if (status === 429) return { definition: ErrorCodes.SYS_RATE_LIMITED };
      if (status === 400) return { definition: ErrorCodes.VAL_INVALID_INPUT };
      if (status === 401) return { definition: ErrorCodes.AUTH_TOKEN_INVALID };
      if (status === 403) return { definition: ErrorCodes.RBAC_FORBIDDEN };
    }
    // Errores propios de Fastify (p. ej. body demasiado grande) traen `statusCode`.
    const statusCode = (exception as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 413) return { definition: ErrorCodes.SYS_PAYLOAD_TOO_LARGE };
    if (statusCode === 400) return { definition: ErrorCodes.VAL_INVALID_INPUT };
    return { definition: ErrorCodes.SYS_INTERNAL };
  }
}
