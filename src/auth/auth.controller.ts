import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: { email: string; password: string; businessName: string }) {
    // TODO: validate, hash password, create business + user + wallets
    return { message: 'Signup not implemented yet' };
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    // TODO: validate, return JWT + refresh
    return { message: 'Login not implemented yet' };
  }
}
