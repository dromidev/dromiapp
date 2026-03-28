/** Seis etapas del acta (índices 0..5). `actaStepsCompleted === 6` implica todas hechas. */
export const ACTA_STEP_COUNT = 6;

export function emptyActaStepTimes(): (string | null)[] {
  return [null, null, null, null, null, null];
}

export function parseActaStepCompletedAt(raw: unknown): (string | null)[] {
  const base = emptyActaStepTimes();
  if (!raw || !Array.isArray(raw)) return base;
  for (let i = 0; i < ACTA_STEP_COUNT; i++) {
    const v = raw[i];
    base[i] = typeof v === "string" && v.length > 0 ? v : null;
  }
  return base;
}

/** Al cambiar el contador de pasos completados, registra o borra marcas de tiempo por paso. */
export function computeNextStepTimes(
  prevCompleted: number,
  nextCompleted: number,
  rawPrev: unknown
): (string | null)[] {
  const out = parseActaStepCompletedAt(rawPrev);
  const now = new Date().toISOString();

  if (nextCompleted > prevCompleted) {
    for (
      let i = prevCompleted;
      i < nextCompleted && i < ACTA_STEP_COUNT;
      i++
    ) {
      out[i] = now;
    }
  } else if (nextCompleted < prevCompleted) {
    for (
      let i = nextCompleted;
      i < prevCompleted && i < ACTA_STEP_COUNT;
      i++
    ) {
      out[i] = null;
    }
  }

  return out;
}
