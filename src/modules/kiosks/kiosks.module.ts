import { Module } from '@nestjs/common';
import { KioskService } from './application/kiosk.service';
import { KioskTenantPurger } from './application/kiosk-tenant-purger';
import { KIOSK_REPOSITORY } from './domain/ports/kiosk.repository.port';
import { DrizzleKioskRepository } from './infrastructure/persistence/drizzle-kiosk.repository';
import { KiosksController } from './interfaces/http/kiosks.controller';

@Module({
  controllers: [KiosksController],
  providers: [{ provide: KIOSK_REPOSITORY, useClass: DrizzleKioskRepository }, KioskService, KioskTenantPurger],
})
export class KiosksModule {}
