export type UserRole = 'CLIENT' | 'OWNER' | 'PROFESSIONAL';

export type Gender = 'FEMALE' | 'MALE' | 'NON_BINARY' | 'OTHERS';

export interface User {
  id: string;
  email: string;
  roles: UserRole[];
  createdAt: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  gender?: Gender;
  profileImageUrl?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
