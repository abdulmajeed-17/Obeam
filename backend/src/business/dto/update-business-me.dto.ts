import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateBusinessMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Business name must not be empty' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Country must be at least 2 characters (e.g. NG, GH)' })
  country?: string;
}
