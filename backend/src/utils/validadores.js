// Reglas de validación compartidas por los controladores (producto, cliente,
// proveedor, categoría, ventas, cuentas). Cada función devuelve un mensaje de
// error en español, o null si el valor es válido.

function limpiar(valor) {
  return (valor ?? '').toString().trim();
}

function validarTexto(valor, { min = 2, max = 60, campo = 'Este campo' } = {}) {
  const v = limpiar(valor);
  if (!v) return `${campo} es obligatorio.`;
  if (v.length < min) return `${campo} debe tener al menos ${min} caracteres.`;
  if (v.length > max) return `${campo} no puede tener más de ${max} caracteres.`;
  return null;
}

function validarCedula(valor, { requerido = false, campo = 'La cédula/RUC' } = {}) {
  const v = limpiar(valor);
  if (!v) return requerido ? `${campo} es obligatoria.` : null;
  if (!/^\d+$/.test(v)) return `${campo} solo puede contener números.`;
  if (v.length !== 10 && v.length !== 13) return `${campo} debe tener 10 (cédula) o 13 (RUC) dígitos.`;
  return null;
}

function validarTelefono(valor, { requerido = false, campo = 'El teléfono' } = {}) {
  const v = limpiar(valor);
  if (!v) return requerido ? `${campo} es obligatorio.` : null;
  if (!/^\d+$/.test(v)) return `${campo} solo puede contener números.`;
  if (v.length < 7 || v.length > 10) return `${campo} debe tener entre 7 y 10 dígitos.`;
  return null;
}

// mayorQueCero=true exige > 0; si no, exige >= 0. maxDecimales limita la parte decimal.
// max acota la magnitud (por defecto 999999.99, igual al límite aplicado en el frontend).
function validarMonto(valor, { mayorQueCero = false, campo = 'El monto', maxDecimales = 2, max = 999999.99 } = {}) {
  const v = limpiar(valor);
  if (v === '') return `${campo} es obligatorio.`;
  if (!/^\d+(\.\d+)?$/.test(v)) return `${campo} debe ser un número válido.`;
  const n = Number(v);
  if (mayorQueCero && n <= 0) return `${campo} debe ser mayor a 0.`;
  if (!mayorQueCero && n < 0) return `${campo} no puede ser negativo.`;
  if (n > max) return `${campo} no puede ser mayor a ${max}.`;
  const decimales = v.split('.')[1];
  if (decimales && decimales.length > maxDecimales) return `${campo} admite máximo ${maxDecimales} decimales.`;
  return null;
}

// max acota la magnitud (por defecto 999999, igual al límite aplicado en el frontend).
function validarEntero(valor, { campo = 'Este campo', max = 999999 } = {}) {
  const v = limpiar(valor);
  if (v === '') return `${campo} es obligatorio.`;
  if (!/^\d+$/.test(v)) return `${campo} debe ser un número entero mayor o igual a 0.`;
  if (Number(v) > max) return `${campo} no puede ser mayor a ${max}.`;
  return null;
}

module.exports = { validarTexto, validarCedula, validarTelefono, validarMonto, validarEntero };
