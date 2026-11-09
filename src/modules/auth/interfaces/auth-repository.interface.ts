import type { UsersAttributes } from '../../../database/models/users.model';

export type CredentialUpdates = Partial<
  Pick<
    UsersAttributes,
    'password' | 'failed_attempts' | 'locked_until' | 'last_login'
  >
>;
export interface LoginDecision {
  authenticated: boolean;
  updates?: CredentialUpdates;
}
export type DecideLogin = (
  account: UsersAttributes | null,
) => Promise<LoginDecision>;

export interface IAuthRepository {
  attemptLogin(
    username: string,
    decide: DecideLogin,
  ): Promise<UsersAttributes | null>;
}
