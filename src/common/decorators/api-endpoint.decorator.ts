import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api/api-response.dto';
import { PaginationMetaDto } from '../dto/pagination/pagination-meta.dto';

type SchemaObject = ApiResponseSchemaHost['schema'];

interface ApiCrudOptions {
  summary: string;
  description?: string;
  responseType: Type<unknown>;
  responseDescription: string;

  badRequestDescription?: string;
  notFoundDescription?: string;
  conflictDescription?: string;
  unauthorizedDescription?: string;

  isCreated?: boolean;
  isArray?: boolean;
  isPaginated?: boolean;
  hasIdParam?: boolean;
}

export function ApiCrud(options: ApiCrudOptions) {
  const decorators: MethodDecorator[] = [
    ApiExtraModels(ApiResponseDto, PaginationMetaDto, options.responseType),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  if (options.hasIdParam) {
    decorators.push(
      ApiParam({
        name: 'id',
        type: Number,
        example: 1,
        description: 'Identificador del recurso.',
      }),
    );
  }

  const itemSchema = { $ref: getSchemaPath(options.responseType) };
  let dataSchema: SchemaObject | { $ref: string } = itemSchema;

  if (options.isPaginated) {
    dataSchema = {
      type: 'object',
      required: ['items', 'meta'],
      properties: {
        items: { type: 'array', items: itemSchema },
        meta: { $ref: getSchemaPath(PaginationMetaDto) },
      },
    };
  } else if (options.isArray) {
    dataSchema = { type: 'array', items: itemSchema };
  }

  const responseSchema = (
    success: boolean,
    code: number,
    data: SchemaObject | { $ref: string },
  ): SchemaObject => ({
    allOf: [
      { $ref: getSchemaPath(ApiResponseDto) },
      {
        type: 'object',
        required: ['success', 'code', 'message', 'data', 'timestamp', 'path'],
        properties: {
          success: { type: 'boolean', enum: [success] },
          code: { type: 'integer', enum: [code] },
          data,
        },
      },
    ],
  });

  const errorSchema = (code: number) =>
    responseSchema(false, code, {
      type: 'object',
      nullable: true,
      enum: [null],
    });

  const successResponse = {
    description: options.responseDescription,
    schema: responseSchema(true, options.isCreated ? 201 : 200, dataSchema),
  };

  decorators.push(
    options.isCreated
      ? ApiCreatedResponse(successResponse)
      : ApiOkResponse(successResponse),
  );

  if (options.badRequestDescription) {
    decorators.push(
      ApiBadRequestResponse({
        description: options.badRequestDescription,
        schema: errorSchema(400),
      }),
    );
  }

  if (options.unauthorizedDescription) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: options.unauthorizedDescription,
        schema: errorSchema(401),
      }),
    );
  }

  if (options.notFoundDescription) {
    decorators.push(
      ApiNotFoundResponse({
        description: options.notFoundDescription,
        schema: errorSchema(404),
      }),
    );
  }

  if (options.conflictDescription) {
    decorators.push(
      ApiConflictResponse({
        description: options.conflictDescription,
        schema: errorSchema(409),
      }),
    );
  }

  decorators.push(
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor.',
      schema: errorSchema(500),
    }),
  );

  return applyDecorators(...decorators);
}
