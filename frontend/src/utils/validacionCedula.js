/**
 * VALIDACIÓN MÓDULO 10 — Cédula y RUC (Ecuador)
 * ==============================================
 * Implementación del algoritmo oficial del SRI/SBS para verificar
 * que un número de cédula (10 dígitos) o RUC (13 dígitos, los 3
 * últimos deben ser 001) sea estructuralmente válido.
 *
 * Cédula:  10 dígitos, el último es el dígito verificador.
 * RUC:    13 dígitos, los 3 últimos deben ser 001 (persona natural)
 *         o 002/003 (sociedades, no aplica aquí).
 *
 * Uso:
 *   validarModulo10('1712345678')  → true/false
 *   validarModulo10('1712345678001') → true/false
 */

function validarModulo10(numero) {
  const limpio = (numero || '').replace(/\D/g, '');

  // La cédula tiene exactamente 10 dígitos; el RUC persona natural 13 (001 al final)
  if (limpio.length !== 10 && limpio.length !== 13) return false;

  // Si es RUC, los 3 últimos deben ser 001
  if (limpio.length === 13 && limpio.slice(10) !== '001') return false;

  const digitos = limpio.slice(0, 10).split('').map(Number);

  // El último dígito es el verificador
  const verificador = digitos[9];

  // Coeficientes fijos del algoritmo Módulo 10
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = digitos[i] * coeficientes[i];
    if (producto >= 10) producto -= 9; // sumar las cifras del producto
    suma += producto;
  }

  const decenaSuperior = Math.ceil(suma / 10) * 10;
  const digitoEsperado = decenaSuperior - suma;

  // Si el resultado es 10, el dígito verificador debe ser 0
  return digitoEsperado === 10 ? verificador === 0 : verificador === digitoEsperado;
}

/**
 * FORMATO DE CÉDULA/RUC
 * Devuelve un objeto con:
 *   valido: boolean
 *   tipo: 'cedula' | 'ruc' | 'invalido'
 *   mensaje: string (para mostrar en UI)
 */
function validarIdentificacion(numero) {
  const limpio = (numero || '').replace(/\D/g, '');

  if (!limpio) {
    return { valido: false, tipo: 'invalido', mensaje: '' };
  }

  if (limpio.length !== 10 && limpio.length !== 13) {
    return { valido: false, tipo: 'invalido', mensaje: 'Debe tener 10 dígitos (cédula) o 13 (RUC).' };
  }

  if (limpio.length === 13 && limpio.slice(10) !== '001') {
    return { valido: false, tipo: 'invalido', mensaje: 'RUC de persona natural debe terminar en 001.' };
  }

  if (!validarModulo10(limpio)) {
    const tipo = limpio.length === 10 ? 'cédula' : 'RUC';
    return { valido: false, tipo: 'invalido', mensaje: `La ${tipo} no es válida (error en dígito verificador).` };
  }

  return {
    valido: true,
    tipo: limpio.length === 10 ? 'cedula' : 'ruc',
    mensaje: limpio.length === 10 ? '✅ Cédula válida' : '✅ RUC válido',
  };
}

export { validarModulo10, validarIdentificacion };