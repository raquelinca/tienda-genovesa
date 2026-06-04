import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';
import Caja from './pages/Caja';
import Login from './pages/Login';
import CuentasCobrar from './pages/CuentasCobrar';
import CuentasPagar from './pages/CuentasPagar';

function App() {
  const [pantalla, setPantalla] = useState('dashboard');
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (u) => { setUsuario(u); setPantalla('dashboard'); };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  if (!usuario) return <Login onLogin={handleLogin} />;

  return (
    <div style={{width:'100%',minHeight:'100vh',background:'#f8f9fa'}}>
      <div style={{background:'#1565C0',padding:'0 20px',display:'flex',alignItems:'center',gap:'6px',height:'52px',boxShadow:'0 2px 8px #1565C040'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginRight:'20px'}}>
          <div style={{background:'#0D47A1',borderRadius:'8px',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🛒</div>
          <div>
            <div style={{fontSize:'15px',fontWeight:'500',color:'#ffffff'}}>Genovesa</div>
            <div style={{fontSize:'11px',color:'#90CAF9'}}>Tienda de barrio</div>
          </div>
        </div>
        {['dashboard','inventario','ventas','caja','cxc','cxp'].map((p, i) => (
          <button key={p} onClick={() => setPantalla(p)}
            style={{background: pantalla===p ? '#0D47A1' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'13px',fontWeight: pantalla===p ? '500' : '400',cursor:'pointer'}}>
            {['Dashboard','Inventario','Ventas','Caja','CxC','CxP'][i]}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{color:'#90CAF9',fontSize:'12px'}}>👤 {usuario.nombre}</span>
          <button onClick={handleLogout}
            style={{background:'#0D47A1',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',color:'#fff',cursor:'pointer'}}>
            🚪 Salir
          </button>
        </div>
      </div>

      {pantalla === 'dashboard'  && <Dashboard />}
      {pantalla === 'inventario' && <Inventario />}
      {pantalla === 'ventas'     && <Ventas />}
      {pantalla === 'caja'       && <Caja />}
      {pantalla === 'cxc'        && <CuentasCobrar />}
      {pantalla === 'cxp'        && <CuentasPagar />}
    </div>
  );
}

export default App;