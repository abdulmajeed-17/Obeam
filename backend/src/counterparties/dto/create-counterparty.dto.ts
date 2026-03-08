import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateCounterpartyDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  payoutType?: string;

  @IsString()
  @MinLength(1, { message: 'Account or reference is required' })
  payoutRef!: string;
}
