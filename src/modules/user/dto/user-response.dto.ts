import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  user_id!: number;
  @ApiProperty({ example: 1 })
  fk_person!: number;
  @ApiProperty({ type: Number, nullable: true })
  fk_user_type!: number | null;
  @ApiProperty({ type: String, maxLength: 50 })
  username!: string;
  @ApiProperty({})
  status!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  registration_date!: string;
}
