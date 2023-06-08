import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApolloError } from 'apollo-server-express';
import { AxiosError } from 'axios';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown) {
    // default 예외
    const error = {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '예외가 발생했어요!',
    };

    // Http 예외
    if (exception instanceof HttpException) {
      error.status = exception.getStatus();
      error.message = exception.message;

      // Axios 예외
    } else if (exception instanceof AxiosError) {
      error.status = exception.response.status;
      error.message = exception.response.data.message;
    }
    // console.log('에러 보낸다');
    throw new ApolloError(error.message, error.status.toString());
  }
}
