/**
 * Error de negocio con mensaje apto para el usuario final.
 * Los detalles técnicos se registran en el servidor, nunca se muestran.
 */
export class AppError extends Error {
  readonly userMessage: string;
  readonly status: number;

  constructor(userMessage: string, options: { status?: number; cause?: unknown } = {}) {
    super(userMessage, { cause: options.cause });
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.status = options.status ?? 400;
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>, userMessage = 'Revisa los datos del formulario.') {
    super(userMessage, { status: 422 });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export const GENERIC_ERROR_MESSAGE = 'No fue posible completar la operación. Inténtalo nuevamente.';

/** Traduce cualquier excepción a un mensaje seguro para la interfaz. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  return GENERIC_ERROR_MESSAGE;
}

/** Registro centralizado: el detalle técnico queda solo en los logs. */
export function logError(context: string, error: unknown): void {
  const value = error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      }
    : error;
  console.error(`[${context}]`, JSON.stringify(value));
}
