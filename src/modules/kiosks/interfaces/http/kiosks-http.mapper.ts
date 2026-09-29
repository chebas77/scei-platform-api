import { Kiosk } from '../../domain/kiosk';
import { KioskResponseDto } from './dto/kiosks.response.dto';

export const KiosksHttpMapper = {
  toKiosk(k: Kiosk): KioskResponseDto {
    return { id: k.id, code: k.code, name: k.name, status: k.status, createdAt: k.createdAt.toISOString(), updatedAt: k.updatedAt.toISOString() };
  },
};
