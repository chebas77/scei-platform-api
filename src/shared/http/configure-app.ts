import { randomUUID } from 'node:crypto';
import { RequestMethod, ValidationError, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppConfig } from '../config/env';
import { AppException, ErrorDetail } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';
import { GlobalExceptionFilter } from '../errors/http-exception.filter';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildFastifyAdapter(config: AppConfig): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 1_048_576, // 1 MiB (API4)
    // Reutiliza un x-request-id válido del proxy; si no, genera uno. Sirve como `traceId`.
    genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && UUID_RE.test(incoming) ? incoming : randomUUID();
    },
  });
}

function flattenValidation(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flattenValidation(e.children ?? [], field)];
  });
}

/** Configuración común a `main.ts` y a las pruebas e2e: mismo comportamiento en ambos. */
export async function configureApp(app: NestFastifyApplication, config: AppConfig): Promise<void> {
  app.setGlobalPrefix('v1', { exclude: [{ path: 'docs', method: RequestMethod.GET }] });
  app.enableShutdownHooks();

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos no declarados en el DTO de entrada
      forbidNonWhitelisted: true, // y rechaza la solicitud si vienen (mass assignment)
      transform: true,
      exceptionFactory: (errors) => new AppException(ErrorCodes.VAL_INVALID_INPUT, flattenValidation(errors)),
    }),
  );

  await app.register(helmet as never, {
    contentSecurityPolicy: config.SWAGGER_ENABLED
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          },
        }
      : undefined,
    hsts: config.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  app.enableCors({
    origin: config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    maxAge: 600,
  });

  if (config.SWAGGER_ENABLED) setupSwagger(app);
}

function setupSwagger(app: NestFastifyApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('SCEI Platform API')
      .setDescription(
        'API de la plataforma multi-colegio. Todos los errores usan el formato `ErrorResponseDto` con un código estable (`AUTH-001`, `TEN-002`...).',
      )
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json', swaggerOptions: { persistAuthorization: true } });
}
