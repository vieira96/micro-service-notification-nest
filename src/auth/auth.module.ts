import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Module({
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
