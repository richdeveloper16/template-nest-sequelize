import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCrud } from '../../common/decorators/api-endpoint.decorator';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Se requiere un token de acceso válido.',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCrud({
    summary: 'Registrar un usuario',
    description: 'Registra un usuario.',
    responseType: UserResponseDto,
    responseDescription: 'Usuario registrado correctamente.',
    badRequestDescription: 'Los datos de el usuario no son válidos.',
    conflictDescription: 'Ya existe un usuario con los mismos valores únicos.',
    isCreated: true,
  })
  create(@Body() dto: CreateUserDto) {
    return this.userService.save(dto);
  }

  @Get()
  @ApiCrud({
    summary: 'Consultar todos los usuarios',
    description:
      'Devuelve todos los usuarios, activos e inactivos, sin paginación.',
    responseType: UserResponseDto,
    responseDescription: 'Usuarios consultados correctamente.',
    isArray: true,
  })
  findAll() {
    return this.userService.findAll();
  }

  @Get('paginated')
  @ApiCrud({
    summary: 'Consultar Usuarios con paginación',
    description:
      'Filtra por identificador, tipo de usuario, nombre de usuario y estado; devuelve resultados y metadatos de paginación.',
    responseType: UserResponseDto,
    responseDescription: 'Página de usuarios consultada correctamente.',
    badRequestDescription:
      'Los filtros o los parámetros de paginación no son válidos.',
    isPaginated: true,
  })
  findAllPaginated(@Query() filters: UserFilterDto) {
    return this.userService.findAllPaginated(filters);
  }

  @Get(':id')
  @ApiCrud({
    summary: 'Consultar Usuario por identificador',
    responseType: UserResponseDto,
    responseDescription: 'Usuario consultado correctamente.',
    badRequestDescription: 'El identificador debe ser un número entero.',
    notFoundDescription: 'Usuario no encontrado.',
    hasIdParam: true,
  })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiCrud({
    summary: 'Actualizar Usuario',
    description: 'Actualiza únicamente los campos enviados.',
    responseType: UserResponseDto,
    responseDescription: 'Usuario actualizado correctamente.',
    badRequestDescription:
      'El identificador o los datos enviados no son válidos.',
    notFoundDescription: 'Usuario no encontrado.',
    conflictDescription: 'Ya existe un usuario con los mismos valores únicos.',
    hasIdParam: true,
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }
}
