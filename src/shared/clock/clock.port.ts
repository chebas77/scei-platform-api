/** Puerto de tiempo: permite fijar la hora en pruebas y evita `new Date()` disperso. */
export interface ClockPort {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
