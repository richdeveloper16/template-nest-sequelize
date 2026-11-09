import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '../../common/util/password.util';
import { UserService } from '../user/user.service';
import { UserMapper } from '../user/mapper/user.mapper';
import { AuthRepository } from './repository/auth.repository';
import type { LoginDto } from './dto/login.dto';
import type { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  private readonly maxAttempts = 5;
  private readonly lockDurationMs = 15 * 60 * 1000;

  constructor(
    private readonly repository: AuthRepository,
    private readonly users: UserService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    this.dummyHash = await hashPassword(
      randomBytes(32).toString('hex'),
      this.hashOptions(),
    );
  }

  private hashOptions() {
    return {
      rounds: this.config.getOrThrow<number>('BCRYPT_ROUNDS'),
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const options = this.hashOptions();
    const account = await this.repository.attemptLogin(
      dto.username,
      async (user) => {
        const valid = await verifyPassword(
          !user && Buffer.byteLength(dto.password, 'utf8') > 72
            ? 'unknown-account-password'
            : dto.password,
          user?.password ?? this.dummyHash,
        );
        const now = new Date();
        if (
          !user ||
          !user.status ||
          (user.locked_until && user.locked_until > now)
        ) {
          return { authenticated: false };
        }
        if (!valid) {
          const attempts = (user.locked_until ? 0 : user.failed_attempts) + 1;
          return {
            authenticated: false,
            updates: {
              failed_attempts: attempts,
              locked_until:
                attempts >= this.maxAttempts
                  ? new Date(now.getTime() + this.lockDurationMs)
                  : null,
            },
          };
        }
        const oldRounds = Number(user.password.split('$')[2]);
        const upgrade =
          Buffer.byteLength(dto.password, 'utf8') <= 72 &&
          (user.password.startsWith('scrypt$') || oldRounds < options.rounds);
        return {
          authenticated: true,
          updates: {
            failed_attempts: 0,
            locked_until: null,
            last_login: now,
            ...(upgrade
              ? { password: await hashPassword(dto.password, options) }
              : {}),
          },
        };
      },
    );
    // Throw after the transaction commits so failed attempts are persisted.
    if (!account) throw new UnauthorizedException('Credenciales inválidas');
    return {
      access_token: await this.jwt.signAsync({ sub: String(account.user_id) }),
      token_type: 'Bearer',
      expires_in: this.config.getOrThrow<number>('JWT_TTL_SECONDS'),
      user: UserMapper.toResponse(account),
    };
  }

  async currentUser(id: number) {
    try {
      const user = await this.users.findById(id);
      if (!user.status) throw new UnauthorizedException('Sesión inválida');
      return user;
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new UnauthorizedException('Sesión inválida');
      throw error;
    }
  }
}
