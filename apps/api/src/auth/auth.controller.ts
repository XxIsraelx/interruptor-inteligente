import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString } from 'class-validator';
import { timingSafeEqual } from 'crypto';
import { Public } from './public.decorator';

class LoginDto {
  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const expected = Buffer.from(process.env.APP_PASSWORD ?? '');
    const given = Buffer.from(dto.password);
    const ok = expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
    if (!ok) throw new UnauthorizedException('Senha inválida');
    return { token: await this.jwt.signAsync({ sub: 'owner' }) };
  }
}
