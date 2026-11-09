import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../user/dto/user-response.dto';

export class LoginResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty({ enum: ['Bearer'] })
  token_type!: 'Bearer';

  @ApiProperty({ example: 900, description: 'Vigencia en segundos.' })
  expires_in!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
