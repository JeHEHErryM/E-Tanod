import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const body: ErrorBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const status = exception.getStatus();
      body.statusCode = status;
      if (typeof res === 'string') {
        body.message = res;
        body.error = exception.name;
      } else {
        const r = res as Record<string, unknown>;
        body.message = (r.message as string | string[]) ?? exception.message;
        body.error = (r.error as string) ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      body.statusCode = HttpStatus.BAD_REQUEST;
      body.message = 'Database constraint violation';
      body.error = 'Database Error';
      if (exception.code === 'P2002') {
        body.message = `Duplicate value for unique field: ${exception.meta?.target ?? 'unknown'}`;
      } else if (exception.code === 'P2025') {
        body.statusCode = HttpStatus.NOT_FOUND;
        body.message = 'Record not found';
        body.error = 'Not Found';
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    body.path = request.url;
    response.status(body.statusCode).json(body);
  }
}
