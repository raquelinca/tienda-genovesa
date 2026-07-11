const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

(async () => {
  try {
    const c = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tienda_genovesa'
    });
    const [r1] = await c.query("SHOW COLUMNS FROM clientes LIKE 'correo'");
    const [r2] = await c.query("SHOW COLUMNS FROM clientes LIKE 'celular'");
    console.log('correo:', r1.length ? 'EXISTE' : 'NO_EXISTE');
    console.log('celular:', r2.length ? 'EXISTE' : 'NO_EXISTE');
    await c.end();
  } catch (e) {
    console.log('ERROR:', e.message);
  }
})();