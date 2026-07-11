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
    
    // Verificar columnas existentes
    const [r1] = await c.query("SHOW COLUMNS FROM clientes LIKE 'correo'");
    const [r2] = await c.query("SHOW COLUMNS FROM clientes LIKE 'celular'");
    console.log('correo:', r1.length ? 'EXISTE' : 'NO_EXISTE');
    console.log('celular:', r2.length ? 'EXISTE' : 'NO_EXISTE');
    
    // Agregar columnas si no existen
    if (!r1.length) {
      await c.query("ALTER TABLE clientes ADD COLUMN correo VARCHAR(100) DEFAULT '' AFTER telefono");
      console.log('✅ columna correo agregada');
    }
    if (!r2.length) {
      await c.query("ALTER TABLE clientes ADD COLUMN celular VARCHAR(10) DEFAULT '' AFTER correo");
      console.log('✅ columna celular agregada');
    }
    
    await c.end();
  } catch (e) {
    console.log('ERROR:', e.message);
  }
})();