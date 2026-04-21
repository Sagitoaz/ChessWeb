import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier?: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string
}

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(USERNAME_REGEX, { message: 'username can only contain letters, numbers, and underscore' })
  username!: string

  @IsEmail()
  @MaxLength(100)
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: 'password must include uppercase, lowercase, and a number' })
  password!: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName?: string
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  refreshToken!: string
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  refreshToken?: string
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(100)
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: 'password must include uppercase, lowercase, and a number' })
  password!: string
}

export class CheckUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(USERNAME_REGEX, { message: 'username can only contain letters, numbers, and underscore' })
  username!: string
}

export class CheckEmailDto {
  @IsEmail()
  @MaxLength(100)
  email!: string
}

export class GoogleAuthDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  idToken!: string
}
