// =====================================================================
//  sriFactura.js  —  Generador de XML de factura conforme al SRI (Ecuador)
//  Alineado a un comprobante REAL (factura v1.1.0, esquema off-line).
// =====================================================================
//  Solo arma el XML y calcula la clave de acceso.
//  La FIRMA (.p12, XAdES-BES) y el envío al SRI son pasos aparte.
// =====================================================================

const { create } = require('xmlbuilder2');

// Datos del emisor (configúralos en el archivo .env)
const EMISOR = {
  ruc:             process.env.SRI_RUC             || '1719816520001',
  razonSocial:     process.env.SRI_RAZON_SOCIAL    || 'TORO GALARZA FRANKLIN ANGEL',
  nombreComercial: process.env.SRI_NOMBRE_COMERCIAL || '', // opcional: si está vacío, no se incluye
  dirMatriz:       process.env.SRI_DIR_MATRIZ      || 'Barrio: PLAN VICTORIA Calle: S61F Numero: S61-57',
  dirEstab:        process.env.SRI_DIR_ESTAB       || 'Barrio: PLAN VICTORIA Calle: S61F Numero: S61-57',
  estab:           process.env.SRI_ESTAB           || '001',
  ptoEmi:          process.env.SRI_PTO_EMI         || '001',
  ambiente:        process.env.SRI_AMBIENTE        || '1',   // 1=pruebas, 2=produccion
  tipoEmision:     '1',
  obligadoContabilidad: process.env.SRI_OBLIGADO_CONTABILIDAD || 'NO',
};

// IVA por defecto (Ecuador general: 15% = código 4)
const IVA_DEFECTO = {
  codigo: process.env.SRI_IVA_CODIGO || '4',
  tarifa: parseFloat(process.env.SRI_IVA_TARIFA ?? '15'),
};

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const f2 = (n) => r2(n).toFixed(2);

function generarClaveAcceso({ fechaDDMMAAAA, tipoComprobante, ruc, ambiente, serie, secuencial, codigoNumerico, tipoEmision }) {
  const base = `${fechaDDMMAAAA}${tipoComprobante}${ruc}${ambiente}${serie}${secuencial}${codigoNumerico}${tipoEmision}`;
  if (base.length !== 48) throw new Error(`Clave de acceso base debe tener 48 dígitos, tiene ${base.length}`);
  const factores = [2, 3, 4, 5, 6, 7];
  let suma = 0, idx = 0;
  for (let i = base.length - 1; i >= 0; i--) { suma += parseInt(base[i], 10) * factores[idx % 6]; idx++; }
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 1;
  return base + dv;
}

function tipoIdentificacion(cedula) {
  const id = String(cedula || '').trim();
  if (id === '9999999999999' || id === '') return '07'; // consumidor final
  if (id.length === 13) return '04'; // RUC
  if (id.length === 10) return '05'; // cédula
  return '06'; // pasaporte / otro
}

function construirFacturaXML(venta, detalles, iva = IVA_DEFECTO) {
  const fecha = new Date(venta.fecha);
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const aaaa = String(fecha.getFullYear());
  const fechaDDMMAAAA = `${dd}${mm}${aaaa}`;
  const fechaEmision = `${dd}/${mm}/${aaaa}`;

  const secuencial = String(venta.id).padStart(9, '0');
  const serie = `${EMISOR.estab}${EMISOR.ptoEmi}`;
  const codigoNumerico = String(venta.id).padStart(8, '0').slice(-8);

  const claveAcceso = generarClaveAcceso({
    fechaDDMMAAAA, tipoComprobante: '01', ruc: EMISOR.ruc, ambiente: EMISOR.ambiente,
    serie, secuencial, codigoNumerico, tipoEmision: EMISOR.tipoEmision,
  });

  const lineas = detalles.map(d => {
    const base = r2(d.subtotal);
    return { ...d, base, valorIva: r2(base * (iva.tarifa / 100)) };
  });
  const totalSinImpuestos = r2(lineas.reduce((s, l) => s + l.base, 0));
  const totalIva = r2(lineas.reduce((s, l) => s + l.valorIva, 0));
  const importeTotal = r2(totalSinImpuestos + totalIva);

  const idCliente = String(venta.cliente_cedula || '9999999999999');
  const nombreCli = venta.cliente_nombre || 'CONSUMIDOR FINAL';
  const tipoIdCli = tipoIdentificacion(idCliente);
  const dirCliente = venta.cliente_direccion || '';

  const formaPago = venta.tipo_pago === 'efectivo' ? '01'
    : venta.tipo_pago === 'transferencia' ? '20' : '19';

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('factura', { id: 'comprobante', version: '1.1.0' });

  // infoTributaria
  const it = root.ele('infoTributaria');
  it.ele('ambiente').txt(EMISOR.ambiente).up();
  it.ele('tipoEmision').txt(EMISOR.tipoEmision).up();
  it.ele('razonSocial').txt(EMISOR.razonSocial).up();
  if (EMISOR.nombreComercial) it.ele('nombreComercial').txt(EMISOR.nombreComercial).up();
  it.ele('ruc').txt(EMISOR.ruc).up();
  it.ele('claveAcceso').txt(claveAcceso).up();
  it.ele('codDoc').txt('01').up();
  it.ele('estab').txt(EMISOR.estab).up();
  it.ele('ptoEmi').txt(EMISOR.ptoEmi).up();
  it.ele('secuencial').txt(secuencial).up();
  it.ele('dirMatriz').txt(EMISOR.dirMatriz).up();

  // infoFactura
  const inf = root.ele('infoFactura');
  inf.ele('fechaEmision').txt(fechaEmision).up();
  inf.ele('dirEstablecimiento').txt(EMISOR.dirEstab).up();
  inf.ele('obligadoContabilidad').txt(EMISOR.obligadoContabilidad).up();
  inf.ele('tipoIdentificacionComprador').txt(tipoIdCli).up();
  inf.ele('razonSocialComprador').txt(nombreCli).up();
  inf.ele('identificacionComprador').txt(idCliente).up();
  if (dirCliente) inf.ele('direccionComprador').txt(dirCliente).up();
  inf.ele('totalSinImpuestos').txt(f2(totalSinImpuestos)).up();
  inf.ele('totalDescuento').txt('0.00').up();
  const tci = inf.ele('totalConImpuestos');
  const ti = tci.ele('totalImpuesto');
  ti.ele('codigo').txt('2').up();
  ti.ele('codigoPorcentaje').txt(iva.codigo).up();
  ti.ele('baseImponible').txt(f2(totalSinImpuestos)).up();
  ti.ele('valor').txt(f2(totalIva)).up();
  ti.up(); tci.up();
  inf.ele('propina').txt('0.00').up();
  inf.ele('importeTotal').txt(f2(importeTotal)).up();
  inf.ele('moneda').txt('DOLAR').up();
  const pagos = inf.ele('pagos');
  const pago = pagos.ele('pago');
  pago.ele('formaPago').txt(formaPago).up();
  pago.ele('total').txt(f2(importeTotal)).up();
  pago.up(); pagos.up(); inf.up();

  // detalles
  const dets = root.ele('detalles');
  for (const l of lineas) {
    const det = dets.ele('detalle');
    det.ele('codigoPrincipal').txt(String(l.producto_id)).up();
    det.ele('descripcion').txt(l.producto_nombre).up();
    det.ele('cantidad').txt(f2(l.cantidad)).up();
    det.ele('precioUnitario').txt(f2(l.precio_unitario)).up();
    det.ele('descuento').txt('0.00').up();
    det.ele('precioTotalSinImpuesto').txt(f2(l.base)).up();
    const imps = det.ele('impuestos');
    const imp = imps.ele('impuesto');
    imp.ele('codigo').txt('2').up();
    imp.ele('codigoPorcentaje').txt(iva.codigo).up();
    imp.ele('tarifa').txt(f2(iva.tarifa)).up();
    imp.ele('baseImponible').txt(f2(l.base)).up();
    imp.ele('valor').txt(f2(l.valorIva)).up();
    imp.up(); imps.up(); det.up();
  }
  dets.up();

  // infoAdicional
  const extra = root.ele('infoAdicional');
  extra.ele('campoAdicional', { nombre: 'Generado por' }).txt('Sistema Tienda Genovesa').up();
  extra.up();

  const xml = root.end({ prettyPrint: true });
  return { xml, claveAcceso, secuencial, nombreArchivo: `${claveAcceso}.xml`, totales: { totalSinImpuestos, totalIva, importeTotal } };
}

module.exports = { construirFacturaXML, generarClaveAcceso, tipoIdentificacion, EMISOR };
