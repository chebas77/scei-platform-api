import { ErrorDefinition } from './error-codes';

export interface ErrorDetail {
  /** Campo o recurso al que se refiere el detalle (opcional). */
  field?: string;
  message: string;
}

/**
 * Excepción de aplicación/dominio con código estable del catálogo.
 * No depende de HTTP: el filtro global la traduce a la respuesta.
 */
export class AppException extends Error {
  constructor(
    readonly definition: ErrorDefinition,
    readonly details?: ErrorDetail[],
    /** Causa interna solo para logs; nunca se expone al cliente. */
    readonly internalCause?: unknown,
  ) {
    super(definition.message);
    this.name = 'AppException';
  }

  get code(): string {
    return this.definition.code;
  }

  get status(): number {
    return this.definition.status;
  }
}
