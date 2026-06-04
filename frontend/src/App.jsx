import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';
import Caja from './pages/Caja';
import Login from './pages/Login';

function App() {
  const [pantalla, setPantalla] = useState('dashboard');
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (u) => {
    setUsuario(u);
    setPantalla('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  if (!usuario) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',padding:'0 20px',display:'flex',alignItems:'center',gap:'6px',height:'50px',boxShadow:'0 2px 8px #0891b240'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginRight:'20px'}}>
          <div style={{background:'#164e63',borderRadius:'8px',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🛒</div>
          <div>
            <div style={{fontSize:'15px',fontWeight:'700',color:'#ffffff'}}>Genovesa</div>
            <div style={{fontSize:'12px',color:'#ffffff',fontWeight:'500'}}>Tienda de barrio</div>
          </div>
        </div>

        <button onClick={() => setPantalla('dashboard')}
          style={{background: pantalla==='dashboard' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Dashboard
        </button>
        <button onClick={() => setPantalla('inventario')}
          style={{background: pantalla==='inventario' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Inventario
        </button>
        <button onClick={() => setPantalla('ventas')}
          style={{background: pantalla==='ventas' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Ventas
        </button>
        <button onClick={() => setPantalla('caja')}
          style={{background: pantalla==='caja' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Caja
        </button>

        {/* Usuario y cerrar sesión */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{color:'#cffafe',fontSize:'12px'}}>👤 {usuario.nombre}</span>
          <button onClick={handleLogout}
            style={{background:'#164e63',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',color:'#fff',cursor:'pointer'}}>
            🚪 Salir
          </button>
        </div>
      </div>

      {pantalla === 'dashboard'  && <Dashboard />}
      {pantalla === 'inventario' && <Inventario />}
      {pantalla === 'ventas'     && <Ventas />}
      {pantalla === 'caja'       && <Caja />}
    </div>
  );
}

export default App;