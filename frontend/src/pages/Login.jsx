import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('⚠️ Por favor ingresa tu correo y contraseña.'); return;
    }
    setCargando(true); setError('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        onLogin(data.usuario);
      } else {
        setError('❌ Correo o contraseña incorrectos.');
      }
    } catch { setError('❌ No se pudo conectar con el servidor.'); }
    setCargando(false);
  };

  return (
    <div style={{background:'#E3F2FD',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
      <div style={{background:'#fff',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'420px',border:'0.5px solid #BBDEFB',boxShadow:'0 4px 20px #1565C020'}}>

        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{background:'#1565C0',borderRadius:'16px',width:'64px',height:'64px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',margin:'0 auto 16px'}}>🛒</div>
          <h1 style={{color:'#1565C0',fontSize:'24px',margin:'0 0 6px',fontWeight:'500'}}>Tienda Genovesa</h1>
          <p style={{color:'#666',fontSize:'14px',margin:0}}>Sistema de Gestión Comercial</p>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',border:'1px solid #FFCDD2',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',color:'#C62828',fontSize:'13px'}}>
            {error}
          </div>
        )}

        <div style={{marginBottom:'16px'}}>
          <label style={{fontSize:'13px',color:'#1565C0',display:'block',marginBottom:'6px',fontWeight:'500'}}>Correo electrónico</label>
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@tienda.com"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'14px',boxSizing:'border-box'}} />
        </div>

        <div style={{marginBottom:'24px'}}>
          <label style={{fontSize:'13px',color:'#1565C0',display:'block',marginBottom:'6px',fontWeight:'500'}}>Contraseña</label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'14px',boxSizing:'border-box'}} />
        </div>

        <button onClick={handleLogin} disabled={cargando}
          style={{width:'100%',padding:'13px',borderRadius:'8px',border:'none',background:'#1565C0',color:'#fff',fontSize:'15px',fontWeight:'500',cursor: cargando ? 'default' : 'pointer',opacity: cargando ? 0.7 : 1}}>
          {cargando ? '⏳ Ingresando...' : '🔐 Ingresar'}
        </button>

        <p style={{textAlign:'center',color:'#999',fontSize:'12px',marginTop:'20px'}}>
          Usuario: admin@tienda.com / 1234
        </p>
      </div>
    </div>
  );
}