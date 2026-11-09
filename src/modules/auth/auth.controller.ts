import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCrud } from '../../common/decorators/api-endpoint.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiCrud({
    summary: 'Iniciar sesión',
    responseType: LoginResponseDto,
    responseDescription: 'Token y perfil del usuario.',
    badRequestDescription: 'Entrada inválida.',
    unauthorizedDescription: 'Credenciales inválidas o cuenta no disponible.',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiCrud({
    summary: 'Consultar mi perfil',
    responseType: UserResponseDto,
    responseDescription: 'Perfil del usuario autenticado.',
    unauthorizedDescription: 'Token inválido o usuario inactivo.',
  })
  me(@CurrentUser() user: UserResponseDto) {
    return user;
  }
}
