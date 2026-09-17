export type UserRole = 'member' | 'staff' | 'manager' | 'owner' | 'platform';

export interface JwtPayload {
  sub: string;
  shopId: string;
  role: UserRole;
  type: 'member' | 'admin' | 'platform';
}
