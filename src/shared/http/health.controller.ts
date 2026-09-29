import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { Db, DB } from '../database/tx';
import { Public } from '../security/decorators';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: true })
  database: boolean;
}

@ApiTags('Sistema')
@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado del servicio (liveness/readiness)' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    let database = false;
    try {
      await this.db.execute(sql`select 1`);
      database = true;
    } catch {
      database = false;
    }
    return { status: database ? 'ok' : 'degraded', database };
  }
}
