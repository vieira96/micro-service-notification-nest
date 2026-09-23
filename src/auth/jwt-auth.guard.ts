import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  id: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer = process.env.JWT_ISSUER ?? 'library-api';
  private readonly audience = process.env.JWT_AUDIENCE ?? 'library-services';
  private readonly jwks = createRemoteJWKSet(
    new URL(
      process.env.JWT_JWKS_URI ?? 'http://localhost:8000/.well-known/jwks.json',
    ),
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      });
      if (!payload.sub) {
        throw new UnauthorizedException('Token sem subject.');
      }

      request.user = {
        id: payload.sub,
        roles: Array.isArray(payload.roles)
          ? payload.roles.filter(isString)
          : [],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }

  private extractBearerToken(request: Request): string {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer token obrigatório.');
    }
    return token;
  }
}
