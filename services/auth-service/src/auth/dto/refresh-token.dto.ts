/**
 * Refresh Token DTO
 * Data Transfer Object for refreshing access tokens
 */

import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
