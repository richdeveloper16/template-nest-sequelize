import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserResponseDto } from '../../user/dto/user-response.dto';

export type AuthenticatedRequest = Request & { user: UserResponseDto };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserResponseDto =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
