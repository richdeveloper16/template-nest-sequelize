import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

const valid = { fk_person: 1, username: 'ana', password: 'a secure password' };
const pipe = new ValidationPipe({ whitelist: true, transform: true });

describe('User DTO validation', () => {
  it('strips internal account fields from creation', async () => {
    const result: unknown = await pipe.transform(
      {
        ...valid,
        failed_attempts: 99,
        locked_until: 'invalid',
        last_login: 'invalid',
      },
      { type: 'body', metatype: CreateUserDto },
    );
    expect(result).toEqual(valid);
  });

  it.each([
    { fk_person: 0 },
    { fk_person: 1.5 },
    { fk_person: '1' },
    { fk_user_type: -1 },
    { username: 'a' },
    { username: 'a'.repeat(51) },
    { password: 'short' },
    { password: 'a'.repeat(129) },
    { password: 'a'.repeat(73) },
    { password: 'é'.repeat(37) },
  ])('rejects invalid creation values %j', async (invalid) => {
    await expect(
      pipe.transform(
        { ...valid, ...invalid },
        { type: 'body', metatype: CreateUserDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts false and nullable user type on update and strips unsupported fields', async () => {
    const result: unknown = await pipe.transform(
      {
        status: false,
        fk_user_type: null,
        password: 'ignored',
        failed_attempts: 0,
        update_date: 'ignored',
      },
      { type: 'body', metatype: UpdateUserDto },
    );
    expect(result).toEqual({ status: false, fk_user_type: null });
  });

  it.each([{ username: null }, { fk_person: null }, { status: null }])(
    'rejects null for non-nullable fields %j',
    async (invalid) => {
      await expect(
        pipe.transform(invalid, { type: 'body', metatype: UpdateUserDto }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
