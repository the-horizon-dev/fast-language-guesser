/**
 * Configurações opcionais para a detecção de idioma.
 */
export interface IDetectionSettings {
    /** Número mínimo de caracteres para realizar a detecção. */
    minLength?: number;
    /** Lista de idiomas permitidos (códigos alpha‑2 ou alpha‑3). */
    allowList?: string[];
    /** Lista de idiomas a serem ignorados (códigos alpha‑2 ou alpha‑3). */
    denyList?: string[];
  }
  