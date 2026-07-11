// Firma XAdES-BES + envío al SRI (Ecuador)
// Requisitos: npm install open-factura  +  firma .p12 en el .env
const fs = require('fs');

const WS = {
  pruebas: {
    recepcion:    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  produccion: {
    recepcion:    'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
};

async function firmarYEnviar(xmlSinFirmar, claveAcceso) {
  const p12Path = process.env.SRI_P12_PATH;
  const p12Pass = process.env.SRI_P12_PASSWORD;

  if (!p12Path || !p12Pass) {
    return { ok: false, paso: 'config',
      mensaje: 'Falta configurar tu firma electrónica. Agrega SRI_P12_PATH y SRI_P12_PASSWORD en el archivo .env.' };
  }
  if (!fs.existsSync(p12Path)) {
    return { ok: false, paso: 'config', mensaje: `No se encontró el archivo de firma en: ${p12Path}` };
  }

  let openFactura;
  try {
    openFactura = require('open-factura');
  } catch (e) {
    return { ok: false, paso: 'libreria',
      mensaje: 'Falta instalar la librería de firma. Ejecuta en backend:  npm install open-factura' };
  }
  const { signXml, documentReception, documentAuthorization } = openFactura;
  const ambiente = process.env.SRI_AMBIENTE === '2' ? 'produccion' : 'pruebas';
  const urlRecepcion    = process.env.SRI_RECEPTION_URL     || WS[ambiente].recepcion;
  const urlAutorizacion = process.env.SRI_AUTHORIZATION_URL || WS[ambiente].autorizacion;

  try {
    const p12 = fs.readFileSync(p12Path);
    const xmlFirmado = await signXml(p12, p12Pass, xmlSinFirmar);
    const recepcion = await documentReception(xmlFirmado, urlRecepcion);

    // Si el SRI devuelve (DEVUELTA) el comprobante en la recepción por errores de
    // forma/firma, no existe nada que autorizar todavía — consultarlo igual solo
    // devolvería "no existe" y confundiría la interpretación de la respuesta.
    const estadoRecepcion = recepcion?.RespuestaRecepcionComprobante?.estado || recepcion?.estado;
    const autorizacion = estadoRecepcion === 'RECIBIDA'
      ? await documentAuthorization(claveAcceso, urlAutorizacion)
      : null;

    return { ok: true, ambiente, xmlFirmado, recepcion, autorizacion };
  } catch (err) {
    return { ok: false, paso: 'envio', mensaje: err.message };
  }
}

module.exports = { firmarYEnviar };