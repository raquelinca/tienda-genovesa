// Validación de campos obligatorios antes de firmar/enviar al SRI.
// No es un validador XSD completo (no hay ninguno instalado en el repo);
// revisa presencia, formato y coherencia de los datos que exige la ficha
// técnica del SRI para una factura (RUC, clave de acceso, identificación
// del comprador y que los totales cuadren).
//
// Recibe el objeto devuelto por construirFacturaXML() y la cantidad de
// líneas de detalle. Devuelve { ok: true } o { ok: false, errores: [...] }.
function validarFacturaXML(factura) {
  const errores = [];

  if (!/^\d{13}$/.test(String(factura.ruc || ''))) {
    errores.push(`RUC del emisor inválido: debe tener 13 dígitos (actual: "${factura.ruc}").`);
  }
  if (!/^\d{49}$/.test(String(factura.claveAcceso || ''))) {
    errores.push(`Clave de acceso inválida: debe tener 49 dígitos (actual: ${String(factura.claveAcceso || '').length} dígitos).`);
  }

  const idCliente = String(factura.idCliente || '');
  const tipoIdCli = factura.tipoIdCli;
  if (tipoIdCli === '04' && idCliente.length !== 13) {
    errores.push(`Identificación de comprador marcada como RUC (04) pero no tiene 13 dígitos: "${idCliente}".`);
  }
  if (tipoIdCli === '05' && idCliente.length !== 10) {
    errores.push(`Identificación de comprador marcada como cédula (05) pero no tiene 10 dígitos: "${idCliente}".`);
  }
  if (tipoIdCli === '07' && idCliente !== '9999999999999') {
    errores.push(`Consumidor final (07) debe usar la identificación "9999999999999" (actual: "${idCliente}").`);
  }

  if (!factura.cantidadDetalles || factura.cantidadDetalles < 1) {
    errores.push('La factura no tiene ningún detalle/línea de producto.');
  }

  const { totalSinImpuestos, totalIva, importeTotal } = factura.totales || {};
  const sumaCalculada = Math.round((Number(totalSinImpuestos || 0) + Number(totalIva || 0)) * 100) / 100;
  if (Math.abs(sumaCalculada - Number(importeTotal || 0)) > 0.01) {
    errores.push(`Los totales no cuadran: ${totalSinImpuestos} + ${totalIva} = ${sumaCalculada}, pero importeTotal es ${importeTotal}.`);
  }

  return errores.length ? { ok: false, errores } : { ok: true };
}

module.exports = { validarFacturaXML };
