import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  DatabaseError,
} from 'sequelize';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = this.getHttpMessage(res, message);
    } else if (exception instanceof UniqueConstraintError) {
      status = HttpStatus.CONFLICT;
      message = 'Ya existe un registro con ese valor único';
    } else if (exception instanceof ForeignKeyConstraintError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Referencia inválida a un registro relacionado';
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Datos inválidos enviados a la base de datos';
    } else if (exception instanceof DatabaseError) {
      const code = (exception.parent as Error & { code?: string }).code;
      if (
        code &&
        [
          '23502',
          '23514',
          '22P02',
          '22001',
          '22003',
          '22007',
          '22008',
        ].includes(code)
      ) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Datos inválidos enviados a la base de datos';
      } else {
        message = 'Error en la base de datos';
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${Array.isArray(message) ? message.join(', ') : message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      code: status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getHttpMessage(
    response: string | object,
    fallback: string | string[],
  ): string | string[] {
    if (typeof response === 'string') return response;
    if (!('message' in response)) return fallback;

    const responseMessage = response.message;
    if (typeof responseMessage === 'string') return responseMessage;
    if (
      Array.isArray(responseMessage) &&
      responseMessage.every((item): item is string => typeof item === 'string')
    ) {
      return responseMessage;
    }

    return fallback;
  }
}
