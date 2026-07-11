// Limpia el valor de un input numérico mientras el usuario escribe: bloquea
// letras/símbolos, quita ceros a la izquierda, limita decimales y aplica un
// tope máximo. Se usa en todos los campos de precio/monto/stock de la app.
function limpiarNumero(valor, { decimales = 2, max } = {}) {
  let v = decimales > 0 ? valor.replace(/[^\d.]/g, '') : valor.replace(/[^\d]/g, '');

  if (decimales > 0) {
    const primerPunto = v.indexOf('.');
    if (primerPunto !== -1) {
      v = v.slice(0, primerPunto + 1) + v.slice(primerPunto + 1).replace(/\./g, '');
    }
  }

  let [entero, decimal] = v.split('.');
  entero = (entero || '').replace(/^0+(?=\d)/, '');
  if (decimal !== undefined) decimal = decimal.slice(0, decimales);
  v = decimal !== undefined ? `${entero}.${decimal}` : entero;

  if (max !== undefined && v !== '' && v !== '.' && Number(v) > max) v = String(max);
  return v;
}

export const MAX_MONTO = 999999.99;
export const MAX_CANTIDAD = 999999;

// Precio, monto, abono, cupo de crédito: hasta 2 decimales, tope 999999.99.
export const limpiarMonto = (valor) => limpiarNumero(valor, { decimales: 2, max: MAX_MONTO });

// Stock / cantidades: enteros, tope 999999.
export const limpiarEntero = (valor) => limpiarNumero(valor, { decimales: 0, max: MAX_CANTIDAD });
