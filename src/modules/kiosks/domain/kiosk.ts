export type KioskStatus = 'active' | 'inactive';

export interface Kiosk {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: KioskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewKiosk {
  tenantId: string;
  code: string;
  name: string;
}
