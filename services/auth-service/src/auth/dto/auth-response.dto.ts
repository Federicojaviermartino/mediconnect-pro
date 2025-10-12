/**
 * Auth Response DTO
 * Standard response format for authentication endpoints
 */

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };

  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  message?: string;
}
