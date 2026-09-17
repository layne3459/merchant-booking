import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCodes } from '../constants/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCodes.BAD_REQUEST;
    let message = '服务器内部错误';

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const body = exception.getResponse() as { code: number; message: string };
      code = body.code;
      message = body.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message: string | string[] }).message;
        message = Array.isArray(msg) ? msg.join('; ') : msg;
      } else if (typeof body === 'string') {
        message = body;
      }
      if (status === HttpStatus.UNAUTHORIZED) {
        code = ErrorCodes.UNAUTHORIZED;
      } else if (status === HttpStatus.FORBIDDEN) {
        code = ErrorCodes.FORBIDDEN;
      } else if (status === HttpStatus.NOT_FOUND) {
        code = ErrorCodes.NOT_FOUND;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
    }

    response.status(status).json({ code, message, data: null });
  }
}
