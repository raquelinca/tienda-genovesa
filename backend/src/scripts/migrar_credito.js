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

    // clientes.cupo_credito
    const [colCupo] = await c.query("SHOW COLUMNS FROM clientes LIKE 'cupo_credito'");
    console.log('clientes.cupo_credito:', colCupo.length ? 'EXISTE' : 'NO_EXISTE');
    if (!colCupo.length) {
      await c.query("ALTER TABLE clientes ADD COLUMN cupo_credito DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER celular");
      console.log('✅ columna cupo_credito agregada a clientes');
    }

    // cuentas_cobrar.estado debe admitir 'credito', y vencimiento debe ser NULL-able
    // (una línea de crédito no tiene fecha de vencimiento propia).
    const [colEstado] = await c.query("SHOW COLUMNS FROM cuentas_cobrar LIKE 'estado'");
    if (colEstado.length && !/credito/i.test(colEstado[0].Type)) {
      await c.query("ALTER TABLE cuentas_cobrar MODIFY COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'");
      console.log('✅ cuentas_cobrar.estado ampliado a VARCHAR(20)');
    } else {
      console.log('cuentas_cobrar.estado:', colEstado.length ? 'ya admite texto libre' : 'NO_EXISTE');
    }
    const [colVenc] = await c.query("SHOW COLUMNS FROM cuentas_cobrar LIKE 'vencimiento'");
    if (colVenc.length && colVenc[0].Null === 'NO') {
      await c.query("ALTER TABLE cuentas_cobrar MODIFY COLUMN vencimiento DATE NULL");
      console.log('✅ cuentas_cobrar.vencimiento ahora admite NULL');
    }

    // Tabla de movimientos de cuentas por cobrar (historial de cargos/abonos)
    const [tabla] = await c.query("SHOW TABLES LIKE 'cuentas_cobrar_movimientos'");
    console.log('cuentas_cobrar_movimientos:', tabla.length ? 'EXISTE' : 'NO_EXISTE');
    if (!tabla.length) {
      await c.query(`
        CREATE TABLE cuentas_cobrar_movimientos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cliente_id INT NOT NULL,
          tipo ENUM('cargo', 'abono') NOT NULL,
          descripcion VARCHAR(255) NOT NULL,
          monto DECIMAL(10,2) NOT NULL,
          venta_id INT NULL,
          fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cliente_id) REFERENCES clientes(id),
          FOREIGN KEY (venta_id) REFERENCES ventas(id)
        )
      `);
      console.log('✅ tabla cuentas_cobrar_movimientos creada');
    }

    await c.end();
  } catch (e) {
    console.log('ERROR:', e.message);
  }
})();
