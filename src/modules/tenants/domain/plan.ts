export interface Plan {
  id: string;
  code: string;
  name: string;
  maxStudents: number;
  maxKiosks: number;
  retentionDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPlan {
  code: string;
  name: string;
  maxStudents: number;
  maxKiosks: number;
  retentionDays: number;
}

export interface UsageSnapshot {
  capturedAt: Date;
  studentsCount: number;
  kiosksCount: number;
  apiP95Ms: number | null;
  queueDepth: number | null;
  errorRate: number | null;
}

/** Devuelve los límites del plan que el uso actual ya supera (vacío = el plan cabe). */
export function limitViolations(plan: Pick<Plan, 'maxStudents' | 'maxKiosks'>, usage: Pick<UsageSnapshot, 'studentsCount' | 'kiosksCount'> | null): string[] {
  if (!usage) return [];
  const out: string[] = [];
  if (usage.studentsCount > plan.maxStudents) out.push(`alumnos: uso ${usage.studentsCount} > límite ${plan.maxStudents}`);
  if (usage.kiosksCount > plan.maxKiosks) out.push(`kioscos: uso ${usage.kiosksCount} > límite ${plan.maxKiosks}`);
  return out;
}
