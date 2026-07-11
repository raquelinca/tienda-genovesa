const https = require('https');

const consultarContribuyente = async (req, res) => {
  try {
    let { id } = req.params;
    id = (id || '').trim();

    // Si tiene 10 dígitos (cédula), agregar "001" para formar RUC
    if (id.length === 10) id += '001';

    if (id.length !== 13) {
      return res.json({ ok: false, mensaje: 'La cédula debe tener 10 dígitos o el RUC 13.' });
    }

    const url = `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?ruc=${id}`;

    const resultado = await new Promise((resolve, reject) => {
      const reqHttps = https.get(url, { timeout: 5000 }, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch {
            reject(new Error('Respuesta inválida del SRI'));
          }
        });
      });
      reqHttps.on('error', (err) => reject(err));
      reqHttps.on('timeout', () => { reqHttps.destroy(); reject(new Error('Timeout')); });
    });

    if (Array.isArray(resultado) && resultado.length > 0 && resultado[0].razonSocial) {
      return res.json({ ok: true, razonSocial: resultado[0].razonSocial });
    }

    res.json({ ok: false, mensaje: 'No se encontró el contribuyente en el SRI.' });
  } catch (err) {
    res.json({ ok: false, mensaje: 'El servicio del SRI no está disponible en este momento.' });
  }
};

module.exports = { consultarContribuyente };