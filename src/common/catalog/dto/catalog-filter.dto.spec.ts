import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CatalogFilterDto } from './catalog-filter.dto';

describe('CatalogFilterDto HTTP query validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const metadata = { type: 'query' as const, metatype: CatalogFilterDto };

  it('preserves description and converts query parameters', async () => {
    const result: unknown = await pipe.transform(
      {
        description: 'Portero',
        element_id: '2',
        status: 'false',
        page: '3',
        limit: '20',
        unknown: 'discard',
      },
      metadata,
    );

    expect(result).toEqual(
      expect.objectContaining({
        description: 'Portero',
        element_id: 2,
        status: false,
        page: 3,
        limit: 20,
      }),
    );
    expect(result).not.toHaveProperty('unknown');
  });

  it('uses inherited pagination defaults', async () => {
    const result: unknown = await pipe.transform({}, metadata);

    expect(result).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
  });

  it.each([
    { element_id: 'abc' },
    { element_id: '1.5' },
    { element_id: '0' },
    { description: 'x'.repeat(101) },
    { status: 'active' },
    { page: '0' },
    { limit: '101' },
  ])('rejects invalid query parameters %j', async (query) => {
    await expect(pipe.transform(query, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
