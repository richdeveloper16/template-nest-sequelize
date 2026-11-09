import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  username!: string;

  // Existing scrypt accounts may have passwords longer than bcrypt's input limit.
  @ApiProperty({ minLength: 1, maxLength: 128, writeOnly: true })
  @IsString()
  @Length(1, 128)
  @IsByteLength(1, 512)
  password!: string;
}
