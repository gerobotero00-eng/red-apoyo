import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const COLORS = {
  lila: "#7C3AED", lilaLight: "#EDE9FE", lilaDark: "#5B21B6",
  naranja: "#EA580C", naranjaLight: "#FFF7ED", naranjaDark: "#C2410C",
  blanco: "#FFFFFF", gris: "#F5F3FF", texto: "#1E1B4B", textoSec: "#6B7280", borde: "#DDD6FE",
};

const STORAGE_KEY = "red_apoyo_users";
const ELECTORES_KEY = "red_apoyo_electores";

// ✅ URL ACTUALIZADA
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx6yuhDP_Li0tm4beio9FJSiWUUfgrLT5b1FDrzIpfA_sQnbK3XCYdNWYf9zQCpe1WD/exec";

const HEADERS_ELECTORES = ["ID","Fecha","Usuario","Nombre","Cédula","Teléfono","F.Nacimiento","Dirección","Barrio","Comuna/Corregimiento","Género","Líder","Puesto de Votación","Mesa","Intención de Voto","Observaciones","Latitud","Longitud"];
const HEADERS_USUARIOS = ["ID","Username","Nombre","Email","Rol","Activo","FechaRegistro"];

const electorToRow = (e) => [String(e.id),e.fecha||"",e.usuarioRegistro||"",e.nombre||"",e.cedula||"",e.telefono||"",e.fechaNacimiento||"",e.direccion||"",e.barrio||"",e.comunaCorregimiento||"",e.genero||"",e.lider||"",e.puestoVotacion||"",e.mesaVotacion||"",e.intencion||"",e.observaciones||"",String(e.lat||""),String(e.lng||"")];

const rowToElector = (obj) => ({
  id: Number(obj["ID"])||Date.now(), fecha:obj["Fecha"]||"", usuarioRegistro:obj["Usuario"]||"",
  nombre:obj["Nombre"]||"", cedula:obj["Cédula"]||"", telefono:obj["Teléfono"]||"",
  fechaNacimiento:obj["F.Nacimiento"]||"", direccion:obj["Dirección"]||"", barrio:obj["Barrio"]||"",
  comunaCorregimiento:obj["Comuna/Corregimiento"]||"", genero:obj["Género"]||"", lider:obj["Líder"]||"",
  puestoVotacion:obj["Puesto de Votación"]||"", mesaVotacion:obj["Mesa"]||"",
  intencion:obj["Intención de Voto"]||"", observaciones:obj["Observaciones"]||"",
  lat:parseFloat(obj["Latitud"])||4.4389, lng:parseFloat(obj["Longitud"])||-75.2322,
});

const userToRow = (u) => [String(u.id),u.username||"",u.nombre||"",u.email||"",u.role||"lider",String(u.activo),u.fechaRegistro||""];

const rowToUser = (obj) => ({
  id: Number(obj["ID"])||Date.now(),
  username: obj["Username"]||"",
  password: obj["Password"]||"lider123",
  nombre: obj["Nombre"]||"",
  email: obj["Email"]||"",
  role: obj["Rol"]||"lider",
  activo: obj["Activo"]==="true"||obj["Activo"]===true,
  fechaRegistro: obj["FechaRegistro"]||"",
});

// ✅ UPSERT: agrega o actualiza UNA fila sin borrar las demás
const upsertToSheets = async (sheetName, headers, row) => {
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ sheet: sheetName, headers, mode: "upsert", row }),
    });
  } catch(_) {}
};

// ✅ DELETE: elimina una fila por ID
const deleteFromSheets = async (sheetName, id) => {
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ sheet: sheetName, mode: "delete", id: String(id) }),
    });
  } catch(_) {}
};

// ✅ SYNC COMPLETO: reemplaza toda la hoja (solo para sincronización manual del admin)
const syncFullSheet = async (sheetName, headers, rows) => {
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ sheet: sheetName, headers, rows }),
    });
  } catch(_) {}
};

// ✅ GET: lee todos los datos de una hoja
const getFromSheets = async (sheetName) => {
  try {
    const res = await fetch(`${SHEETS_URL}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.rows) && data.rows.length > 0) return data.rows;
  } catch(_) {}
  return null;
};

const upsertElector  = (e)       => upsertToSheets("BASE ELECTORAL", HEADERS_ELECTORES, electorToRow(e));
const deleteElector  = (id)      => deleteFromSheets("BASE ELECTORAL", id);
const syncElectores  = (list)    => syncFullSheet("BASE ELECTORAL", HEADERS_ELECTORES, list.map(electorToRow));
const syncUsuarios   = (users)   => upsertToSheets("USUARIOS", HEADERS_USUARIOS, null); // no-op placeholder
const syncUsuariosFull = (users) => syncFullSheet("USUARIOS", HEADERS_USUARIOS, users.filter(u=>u.role!=="admin").map(userToRow));
const upsertUsuario  = (u)       => upsertToSheets("USUARIOS", HEADERS_USUARIOS, userToRow(u));

const DEFAULT_USERS = [
  { id: 1, username: "admin",  password: "admin123",  role: "admin",  nombre: "Administrador", email: "admin@redapoyo.com",  activo: true },
  { id: 2, username: "carlos", password: "carlos123", role: "lider",  nombre: "Carlos Pérez",  email: "carlos@redapoyo.com", activo: true },
  { id: 3, username: "maria",  password: "maria123",  role: "lider",  nombre: "María López",   email: "maria@redapoyo.com",  activo: true },
];

const INITIAL_ELECTORES = [
  { id: 1, nombre: "ANA GÓMEZ TORRES",   cedula: "1098765432", telefono: "3001234567", fechaNacimiento: "1985-03-15", direccion: "CRA 5 # 10-20", barrio: "LA ESTRELLA", comunaCorregimiento: "COMUNA 1",   genero: "FEMENINO",  lider: "CARLOS PÉREZ", puestoVotacion: "COLEGIO SAN LUIS",   mesaVotacion: "3",  intencion: "Si apoya",  observaciones: "", lat: 4.4389, lng: -75.2322, fecha: "2024-01-10 09:30", usuarioRegistro: "carlos" },
  { id: 2, nombre: "PEDRO MARTÍNEZ",     cedula: "1087654321", telefono: "3109876543", fechaNacimiento: "1978-07-22", direccion: "CLL 15 # 8-45",  barrio: "EL VERGEL",   comunaCorregimiento: "ZONA RURAL", genero: "MASCULINO", lider: "CARLOS PÉREZ", puestoVotacion: "ESCUELA EL CARMEN",  mesaVotacion: "7",  intencion: "Indeciso",  observaciones: "SEGUIMIENTO PENDIENTE", lat: 4.4401, lng: -75.2301, fecha: "2024-01-11 11:15", usuarioRegistro: "carlos" },
  { id: 3, nombre: "LUCÍA HERRERA DÍAZ", cedula: "1076543210", telefono: "3201122334", fechaNacimiento: "1992-11-08", direccion: "AV 3 # 22-10",   barrio: "CALAMBEO",    comunaCorregimiento: "COMUNA 8",   genero: "FEMENINO",  lider: "MARÍA LÓPEZ",  puestoVotacion: "INSTITUTO TÉCNICO",  mesaVotacion: "12", intencion: "Si apoya",  observaciones: "", lat: 4.4450, lng: -75.2280, fecha: "2024-01-12 14:00", usuarioRegistro: "maria" },
];

const getUsers     = () => { try { const s=localStorage.getItem(STORAGE_KEY);   return s?JSON.parse(s):DEFAULT_USERS;     } catch { return DEFAULT_USERS; } };
const saveUsers    = (u) => { try { localStorage.setItem(STORAGE_KEY,   JSON.stringify(u)); } catch {} };
const getElectores = () => { try { const s=localStorage.getItem(ELECTORES_KEY); return s?JSON.parse(s):INITIAL_ELECTORES; } catch { return INITIAL_ELECTORES; } };
const saveElectores= (e) => { try { localStorage.setItem(ELECTORES_KEY, JSON.stringify(e)); } catch {} };

const COMUNAS = ["COMUNA 1","COMUNA 2","COMUNA 3","COMUNA 4","COMUNA 5","COMUNA 6","COMUNA 7","COMUNA 8","COMUNA 9","COMUNA 10","COMUNA 11","COMUNA 12","COMUNA 13","ZONA RURAL"];

const styles = {
  mobileFrame:  { maxWidth:430, margin:"0 auto", minHeight:"100vh", background:"#FFFFFF", position:"relative", boxShadow:"0 0 40px rgba(124,58,237,0.15)" },
  header:       { background:`linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)`, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 },
  headerTitle:  { color:"#FFF", fontSize:18, fontWeight:800, margin:0 },
  headerSub:    { color:"rgba(255,255,255,0.8)", fontSize:12, margin:0 },
  content:      { padding:"20px 16px", paddingBottom:80 },
  card:         { background:"#FFF", borderRadius:16, border:"1px solid #DDD6FE", padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(124,58,237,0.08)" },
  btnPrimary:   { background:"linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color:"#FFF", border:"none", borderRadius:14, padding:"14px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 },
  btnSecondary: { background:"linear-gradient(135deg, #EA580C 0%, #C2410C 100%)", color:"#FFF", border:"none", borderRadius:14, padding:"14px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 },
  btnOutline:   { background:"transparent", color:"#7C3AED", border:"2px solid #7C3AED", borderRadius:14, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 },
  btnDanger:    { background:"#FEE2E2", color:"#991B1B", border:"none", borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnSuccess:   { background:"#D1FAE5", color:"#065F46", border:"none", borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" },
  input:        { width:"100%", border:"1.5px solid #DDD6FE", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1E1B4B", background:"#F5F3FF", boxSizing:"border-box", marginBottom:10, outline:"none", textTransform:"uppercase", fontFamily:"inherit" },
  inputNormal:  { width:"100%", border:"1.5px solid #DDD6FE", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1E1B4B", background:"#F5F3FF", boxSizing:"border-box", marginBottom:10, outline:"none", fontFamily:"inherit" },
  label:        { fontSize:12, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4, display:"block" },
  badge: (c)   => ({ background:c==="Si apoya"?"#D1FAE5":c==="Indeciso"?"#FEF3C7":"#FEE2E2", color:c==="Si apoya"?"#065F46":c==="Indeciso"?"#92400E":"#991B1B", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }),
  tab:   (a)   => ({ flex:1, padding:"10px 4px", background:a?"#7C3AED":"transparent", color:a?"#FFF":"#6B7280", border:"none", borderRadius:10, fontSize:12, fontWeight:a?700:500, cursor:"pointer", transition:"all 0.2s" }),
  navBtn:(a)   => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"8px 4px", background:"none", border:"none", color:a?"#7C3AED":"#6B7280", cursor:"pointer", fontSize:10, fontWeight:a?700:500 }),
};

const RadioGroup = ({ value, onChange, options }) => (
  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
    {options.map(opt => (
      <label key={opt} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", borderRadius:12, border:`2px solid ${value===opt?"#7C3AED":"#DDD6FE"}`, background:value===opt?"#EDE9FE":"#F5F3FF", cursor:"pointer", fontSize:13, fontWeight:value===opt?700:500, color:value===opt?"#7C3AED":"#6B7280" }}>
        <input type="radio" value={opt} checked={value===opt} onChange={() => onChange(opt)} style={{ display:"none" }} />
        {value===opt?"●":"○"} {opt}
      </label>
    ))}
  </div>
);

const exportExcel = (electores) => {
  const colWidths = [6,18,10,28,14,13,13,22,16,22,10,20,22,6,14,22,10,10];
  const toRow = (e) => [e.id,e.fecha||"",e.usuarioRegistro||"",e.nombre||"",e.cedula||"",e.telefono||"",e.fechaNacimiento||"",e.direccion||"",e.barrio||"",e.comunaCorregimiento||"",e.genero||"",e.lider||"",e.puestoVotacion||"",e.mesaVotacion||"",e.intencion||"",e.observaciones||"",e.lat||"",e.lng||""];
  const wb = XLSX.utils.book_new();
  const wsG = XLSX.utils.aoa_to_sheet([HEADERS_ELECTORES,...electores.map(toRow)]);
  wsG["!cols"] = colWidths.map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, wsG, "BASE GENERAL");
  [...new Set(electores.map(e=>e.comunaCorregimiento).filter(Boolean))].sort().forEach(comuna => {
    const fil = electores.filter(e=>e.comunaCorregimiento===comuna);
    if (!fil.length) return;
    const ws = XLSX.utils.aoa_to_sheet([HEADERS_ELECTORES,...fil.map(toRow)]);
    ws["!cols"] = colWidths.map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws, comuna.substring(0,31));
  });
  XLSX.writeFile(wb, "base_electoral_robert_leyton.xlsx");
};

// ===================== LOGIN =====================
function LoginScreen({ onLogin, onGoRegister }) {
  const [user,setUser]=useState(""); const [pass,setPass]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const handleLogin = async () => {
    setLoading(true);
    let users = getUsers();
    let found = users.find(u=>u.username.toLowerCase()===user.toLowerCase()&&u.password===pass&&u.activo);
    if(!found) {
      try {
        const sheetUsers = await getFromSheets("USUARIOS");
        if(sheetUsers && sheetUsers.length > 0) {
          const admins = users.filter(u=>u.role==="admin");
          const lideres = sheetUsers.map(rowToUser);
          const merged = [...admins];
          lideres.forEach(sl => {
            if(!merged.find(u=>u.username===sl.username)) merged.push(sl);
            else { const idx=merged.findIndex(u=>u.username===sl.username); if(merged[idx].role!=="admin") merged[idx]={...merged[idx],...sl,password:sl.password}; }
          });
          saveUsers(merged);
          found = merged.find(u=>u.username.toLowerCase()===user.toLowerCase()&&u.password===pass&&u.activo);
        }
      } catch(_) {}
    }
    if(found){onLogin(found);}else{setError("Usuario o contraseña incorrectos");setLoading(false);}
  };
  return (
    <div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"40px 24px" }}>
      <div style={{ width:90, height:90, borderRadius:"50%", background:"linear-gradient(135deg, #7C3AED, #EA580C)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, boxShadow:"0 8px 24px #7C3AED40" }}><span style={{ fontSize:40 }}>🗳️</span></div>
      <h1 style={{ fontSize:22, fontWeight:900, color:"#7C3AED", textAlign:"center", margin:"0 0 4px" }}>Red de Apoyo</h1>
      <h2 style={{ fontSize:18, fontWeight:700, color:"#EA580C", textAlign:"center", margin:"0 0 30px" }}>Robert Leyton</h2>
      <div style={{ width:"100%", maxWidth:340 }}>
        <label style={styles.label}>Usuario</label>
        <input style={styles.inputNormal} placeholder="Tu usuario" value={user} onChange={e=>{setUser(e.target.value);setError("");}} />
        <label style={styles.label}>Contraseña</label>
        <input style={styles.inputNormal} type="password" placeholder="Contraseña" value={pass} onChange={e=>{setPass(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        {error&&<p style={{ color:"#EF4444", fontSize:13, textAlign:"center", marginBottom:10 }}>{error}</p>}
        <button style={{ ...styles.btnPrimary, opacity:loading?0.7:1 }} onClick={handleLogin} disabled={loading}>{loading?"Ingresando...":"Iniciar Sesión"}</button>
        <button style={styles.btnOutline} onClick={onGoRegister}>✍️ Registrarme como Líder</button>
      </div>
    </div>
  );
}

// ===================== REGISTRO USUARIO =====================
function RegisterUserScreen({ onBack, onSuccess }) {
  const [form,setForm]=useState({nombre:"",email:"",username:"",password:"",password2:""}); const [error,setError]=useState(""); const [success,setSuccess]=useState(false);
  const update=(f,v)=>setForm(p=>({...p,[f]:v}));
  const handleRegister = () => {
    if(!form.nombre||!form.email||!form.username||!form.password){setError("Todos los campos son obligatorios");return;}
    if(form.password!==form.password2){setError("Las contraseñas no coinciden");return;}
    if(form.password.length<6){setError("La contraseña debe tener mínimo 6 caracteres");return;}
    const users=getUsers();
    if(users.find(u=>u.username.toLowerCase()===form.username.toLowerCase())){setError("Ese usuario ya existe");return;}
    if(users.find(u=>u.email.toLowerCase()===form.email.toLowerCase())){setError("Ese correo ya está registrado");return;}
    const newUser={id:Date.now(),username:form.username.toLowerCase(),password:form.password,role:"lider",nombre:form.nombre.toUpperCase(),email:form.email.toLowerCase(),activo:true,fechaRegistro:new Date().toLocaleString("es-CO")};
    const updated=[...users,newUser];
    saveUsers(updated);
    upsertUsuario(newUser);
    setSuccess(true);
    setTimeout(()=>{onSuccess();},2000);
  };
  if(success) return (<div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:40 }}><div style={{ fontSize:60, marginBottom:16 }}>✅</div><h2 style={{ color:"#7C3AED", fontWeight:900, textAlign:"center" }}>¡Registro Exitoso!</h2><p style={{ color:"#6B7280", textAlign:"center" }}>Tu cuenta fue creada. Ya puedes iniciar sesión.</p></div>);
  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Crear Cuenta</h2><p style={styles.headerSub}>Registro de nuevo líder</p></div></div>
      <div style={styles.content}>
        {[{label:"Nombre Completo",field:"nombre",upper:true},{label:"Correo Electrónico",field:"email",type:"email"},{label:"Usuario",field:"username"},{label:"Contraseña",field:"password",type:"password"},{label:"Confirmar Contraseña",field:"password2",type:"password"}].map(({label,field,type,upper})=>(
          <div key={field}><label style={styles.label}>{label}</label><input style={upper?styles.input:styles.inputNormal} type={type||"text"} value={form[field]} onChange={e=>update(field,e.target.value)} /></div>
        ))}
        {error&&<p style={{ color:"#EF4444", fontSize:13, textAlign:"center", marginBottom:10, background:"#FEE2E2", padding:"8px 12px", borderRadius:10 }}>{error}</p>}
        <button style={styles.btnPrimary} onClick={handleRegister}>✅ Crear mi Cuenta</button>
      </div>
    </div>
  );
}

// ===================== INICIO =====================
function InicioScreen({ currentUser, electores, onNavigate, onRecargar }) {
  const misRegistros = currentUser.role==="admin" ? electores.length : electores.filter(e=>e.usuarioRegistro===currentUser.username).length;
  return (
    <div>
      <div style={{ ...styles.header, flexDirection:"column", alignItems:"center", padding:"28px 20px" }}>
        <div style={{ width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}><span style={{ fontSize:34 }}>🗳️</span></div>
        <h1 style={{ ...styles.headerTitle, fontSize:20, textAlign:"center" }}>Red de Apoyo</h1>
        <p style={{ ...styles.headerSub, fontSize:15, fontWeight:700 }}>Robert Leyton</p>
        <p style={{ ...styles.headerSub, marginTop:8 }}>Hola, {currentUser.nombre} 👋</p>
        {currentUser.role==="admin"&&<span style={{ background:"#EA580C", color:"#FFF", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:700, marginTop:6 }}>ADMINISTRADOR</span>}
      </div>
      <div style={styles.content}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          <div style={{ background:"#EDE9FE", borderRadius:14, padding:"14px", textAlign:"center" }}><div style={{ fontSize:26, fontWeight:900, color:"#7C3AED" }}>{misRegistros}</div><div style={{ fontSize:11, color:"#7C3AED", fontWeight:600 }}>{currentUser.role==="admin"?"TOTAL REGISTROS":"MIS REGISTROS"}</div></div>
          <div style={{ background:"#FFF7ED", borderRadius:14, padding:"14px", textAlign:"center" }}><div style={{ fontSize:26, fontWeight:900, color:"#EA580C" }}>{electores.filter(e=>e.intencion==="Si apoya").length}</div><div style={{ fontSize:11, color:"#EA580C", fontWeight:600 }}>VOTOS SEGUROS</div></div>
        </div>
        <button style={styles.btnPrimary}   onClick={()=>onNavigate("registro")}><span style={{ fontSize:20 }}>📝</span> Registrar Elector</button>
        <button style={styles.btnSecondary} onClick={()=>onNavigate("registros")}><span style={{ fontSize:20 }}>👥</span> Ver Registros</button>
        {currentUser.role==="admin"&&<button style={styles.btnOutline} onClick={()=>onNavigate("admin")}><span style={{ fontSize:20 }}>⚙️</span> Panel Administrador</button>}
        <button style={{ ...styles.btnOutline, borderColor:"#059669", color:"#059669", marginTop:4 }} onClick={()=>onRecargar()}><span style={{ fontSize:20 }}>🔄</span> Recargar desde Sheets</button>
      </div>
    </div>
  );
}

// ===================== REGISTRO ELECTOR =====================
function RegistroScreen({ currentUser, electores, onSave, onBack }) {
  const [form,setForm]=useState({nombre:"",cedula:"",telefono:"",fechaNacimiento:"",direccion:"",barrio:"",comunaCorregimiento:"",genero:"",lider:currentUser.nombre,puestoVotacion:"",mesaVotacion:"",intencion:"",observaciones:""});
  const [errors,setErrors]=useState({}); const [cedulaError,setCedulaError]=useState(""); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const update=(field,val)=>{setForm(f=>({...f,[field]:val}));setErrors(e=>({...e,[field]:""}));};
  const checkCedula=(ced)=>{if(ced.length>=6)setCedulaError(electores.find(e=>e.cedula===ced)?"⚠️ Esta cédula ya fue registrada":"");else setCedulaError("");};
  const validate=()=>{const e={};if(!form.nombre)e.nombre=true;if(!form.cedula)e.cedula=true;if(!form.telefono)e.telefono=true;if(!form.barrio)e.barrio=true;if(!form.comunaCorregimiento)e.comunaCorregimiento=true;if(!form.genero)e.genero=true;if(!form.intencion)e.intencion=true;return e;};
  const handleSave=()=>{
    const e=validate();
    if(Object.keys(e).length>0){setErrors(e);return;}
    if(cedulaError)return;
    setSaving(true);
    setTimeout(()=>{
      const newElector={...form,nombre:form.nombre.toUpperCase(),direccion:form.direccion.toUpperCase(),barrio:form.barrio.toUpperCase(),lider:form.lider.toUpperCase(),puestoVotacion:form.puestoVotacion.toUpperCase(),observaciones:form.observaciones.toUpperCase(),id:Date.now(),lat:4.4389+Math.random()*0.01,lng:-75.2322+Math.random()*0.01,fecha:new Date().toLocaleString("es-CO"),usuarioRegistro:currentUser.username};
      onSave(newElector);
      setSaving(false);setSaved(true);
    },1000);
  };
  if(saved) return (<div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:40 }}><div style={{ fontSize:60, marginBottom:16 }}>✅</div><h2 style={{ color:"#7C3AED", fontWeight:900 }}>¡Elector Registrado!</h2><p style={{ color:"#6B7280", textAlign:"center" }}>Guardado y enviado a Google Sheets.</p><button style={{ ...styles.btnPrimary, marginTop:20, width:"auto", padding:"12px 30px" }} onClick={onBack}>Volver al Inicio</button></div>);
  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Registrar Elector</h2><p style={styles.headerSub}>Complete todos los campos</p></div></div>
      <div style={styles.content}>
        {[{label:"Nombre Completo",field:"nombre",placeholder:"EJ: JUAN CARLOS RODRÍGUEZ"},{label:"Número de Cédula",field:"cedula",placeholder:"EJ: 1098765432",type:"tel"},{label:"Teléfono",field:"telefono",placeholder:"EJ: 3001234567",type:"tel"},{label:"Fecha de Nacimiento",field:"fechaNacimiento",type:"date"},{label:"Dirección",field:"direccion",placeholder:"EJ: CRA 5 # 10-20"},{label:"Barrio / Vereda",field:"barrio",placeholder:"EJ: LA ESTRELLA"}].map(({label,field,placeholder,type})=>(
          <div key={field}><label style={styles.label}>{label}</label><input style={{ ...styles.input, borderColor:errors[field]?"#EF4444":"#DDD6FE" }} type={type||"text"} placeholder={placeholder} value={form[field]} onChange={e=>{update(field,e.target.value);if(field==="cedula")checkCedula(e.target.value);}}/>{field==="cedula"&&cedulaError&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-8, marginBottom:8 }}>{cedulaError}</p>}{errors[field]&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-8, marginBottom:8 }}>Campo requerido</p>}</div>
        ))}
        <div><label style={styles.label}>Comuna / Corregimiento</label><select style={{ ...styles.input, borderColor:errors.comunaCorregimiento?"#EF4444":"#DDD6FE" }} value={form.comunaCorregimiento} onChange={e=>update("comunaCorregimiento",e.target.value)}><option value="">Seleccionar...</option>{COMUNAS.map(c=><option key={c} value={c}>{c}</option>)}</select>{errors.comunaCorregimiento&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-8, marginBottom:8 }}>Campo requerido</p>}</div>
        {[{label:"Líder que Refiere",field:"lider",placeholder:"NOMBRE DEL LÍDER"},{label:"Puesto de Votación",field:"puestoVotacion",placeholder:"EJ: COLEGIO SAN LUIS"},{label:"Mesa de Votación",field:"mesaVotacion",placeholder:"EJ: 3",type:"tel"}].map(({label,field,placeholder,type})=>(
          <div key={field}><label style={styles.label}>{label}</label><input style={{ ...styles.input, borderColor:errors[field]?"#EF4444":"#DDD6FE" }} type={type||"text"} placeholder={placeholder} value={form[field]} onChange={e=>update(field,e.target.value)}/>{errors[field]&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-8, marginBottom:8 }}>Campo requerido</p>}</div>
        ))}
        <div><label style={styles.label}>Género</label><select style={{ ...styles.input, borderColor:errors.genero?"#EF4444":"#DDD6FE" }} value={form.genero} onChange={e=>update("genero",e.target.value)}><option value="">Seleccionar...</option><option>MASCULINO</option><option>FEMENINO</option><option>OTRO</option></select>{errors.genero&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-8, marginBottom:8 }}>Campo requerido</p>}</div>
        <div><label style={{ ...styles.label, marginBottom:8 }}>Intención de Voto *</label><RadioGroup value={form.intencion} onChange={v=>update("intencion",v)} options={["Si apoya","Indeciso","No apoya"]} />{errors.intencion&&<p style={{ color:"#EF4444", fontSize:12, marginTop:-6, marginBottom:8 }}>Selecciona una opción</p>}</div>
        <div><label style={styles.label}>Observaciones</label><textarea style={{ ...styles.input, height:80, resize:"none" }} placeholder="NOTAS ADICIONALES..." value={form.observaciones} onChange={e=>update("observaciones",e.target.value)} /></div>
        <button style={{ ...styles.btnPrimary, opacity:saving?0.7:1 }} onClick={handleSave} disabled={saving||!!cedulaError}>{saving?"⏳ Guardando...":"💾 Guardar Registro"}</button>
      </div>
    </div>
  );
}

// ===================== EDITAR ELECTOR =====================
function EditarElectorScreen({ elector, onBack, onSave }) {
  const [form,setForm]=useState({...elector}); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const update=(field,val)=>setForm(f=>({...f,[field]:val}));
  const handleSave=()=>{setSaving(true);setTimeout(()=>{onSave({...form,nombre:form.nombre?.toUpperCase(),direccion:form.direccion?.toUpperCase(),barrio:form.barrio?.toUpperCase(),comunaCorregimiento:form.comunaCorregimiento?.toUpperCase(),lider:form.lider?.toUpperCase(),puestoVotacion:form.puestoVotacion?.toUpperCase(),observaciones:form.observaciones?.toUpperCase()});setSaving(false);setSaved(true);},800);};
  if(saved) return (<div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:40 }}><div style={{ fontSize:60, marginBottom:16 }}>✅</div><h2 style={{ color:"#7C3AED", fontWeight:900 }}>¡Registro Actualizado!</h2><button style={{ ...styles.btnPrimary, marginTop:20, width:"auto", padding:"12px 30px" }} onClick={onBack}>Volver</button></div>);
  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>✏️ Editar Elector</h2><p style={styles.headerSub}>{elector.nombre}</p></div></div>
      <div style={styles.content}>
        <div style={{ background:"#EDE9FE", borderRadius:12, padding:12, marginBottom:16 }}><p style={{ margin:0, fontSize:13, color:"#5B21B6" }}>✏️ Modifica los campos que necesites y guarda los cambios.</p></div>
        {[{label:"Nombre Completo",field:"nombre"},{label:"Número de Cédula",field:"cedula",type:"tel"},{label:"Teléfono",field:"telefono",type:"tel"},{label:"Fecha de Nacimiento",field:"fechaNacimiento",type:"date"},{label:"Dirección",field:"direccion"},{label:"Barrio / Vereda",field:"barrio"}].map(({label,field,type})=>(
          <div key={field}><label style={styles.label}>{label}</label><input style={styles.input} type={type||"text"} value={form[field]||""} onChange={e=>update(field,e.target.value)}/></div>
        ))}
        <div><label style={styles.label}>Comuna / Corregimiento</label><select style={styles.input} value={form.comunaCorregimiento||""} onChange={e=>update("comunaCorregimiento",e.target.value)}><option value="">Seleccionar...</option>{COMUNAS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        {[{label:"Líder que Refiere",field:"lider"},{label:"Puesto de Votación",field:"puestoVotacion"},{label:"Mesa de Votación",field:"mesaVotacion",type:"tel"}].map(({label,field,type})=>(
          <div key={field}><label style={styles.label}>{label}</label><input style={styles.input} type={type||"text"} value={form[field]||""} onChange={e=>update(field,e.target.value)}/></div>
        ))}
        <div><label style={styles.label}>Género</label><select style={styles.input} value={form.genero||""} onChange={e=>update("genero",e.target.value)}><option value="">Seleccionar...</option><option>MASCULINO</option><option>FEMENINO</option><option>OTRO</option></select></div>
        <div><label style={{ ...styles.label, marginBottom:8 }}>Intención de Voto</label><RadioGroup value={form.intencion} onChange={v=>update("intencion",v)} options={["Si apoya","Indeciso","No apoya"]} /></div>
        <div><label style={styles.label}>Observaciones</label><textarea style={{ ...styles.input, height:80, resize:"none" }} value={form.observaciones||""} onChange={e=>update("observaciones",e.target.value)} /></div>
        <button style={{ ...styles.btnPrimary, opacity:saving?0.7:1 }} onClick={handleSave} disabled={saving}>{saving?"⏳ Guardando...":"💾 Guardar Cambios"}</button>
        <button style={styles.btnOutline} onClick={onBack}>Cancelar</button>
      </div>
    </div>
  );
}

// ===================== VER REGISTROS =====================
function RegistrosScreen({ currentUser, electores, onBack, onDelete, onEdit }) {
  const [search,setSearch]=useState(""); const [filterIntencion,setFilterIntencion]=useState("Todos"); const [filterLider,setFilterLider]=useState("Todos"); const [selected,setSelected]=useState(null); const [editando,setEditando]=useState(null);
  const lideres=[...new Set(electores.map(e=>e.lider).filter(Boolean))];
  const mis=currentUser.role==="admin"?electores:electores.filter(e=>e.usuarioRegistro===currentUser.username);
  const filtered=mis.filter(e=>{const q=search.toLowerCase();return(!search||e.nombre.toLowerCase().includes(q)||e.cedula.includes(q)||e.barrio.toLowerCase().includes(q))&&(filterIntencion==="Todos"||e.intencion===filterIntencion)&&(filterLider==="Todos"||e.lider===filterLider);});
  if(editando) return (<EditarElectorScreen elector={editando} onBack={()=>setEditando(null)} onSave={(updated)=>{onEdit(updated);setEditando(null);setSelected(updated);}} />);
  if(selected) return (
    <div>
      <div style={styles.header}><button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Detalle Elector</h2></div></div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:14 }}><div><h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{selected.nombre}</h3><p style={{ margin:"2px 0 0", fontSize:13, color:"#6B7280" }}>CC: {selected.cedula}</p></div><span style={styles.badge(selected.intencion)}>{selected.intencion}</span></div>
          {[["📱 Teléfono",selected.telefono],["🗓️ Nacimiento",selected.fechaNacimiento],["🏠 Dirección",selected.direccion],["🏘️ Barrio",selected.barrio],["🏙️ Comuna",selected.comunaCorregimiento],["⚧️ Género",selected.genero],["👤 Líder",selected.lider],["🗳️ Puesto",selected.puestoVotacion],["# Mesa",selected.mesaVotacion],["📅 Fecha",selected.fecha],["👤 Registrado por",selected.usuarioRegistro]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #DDD6FE" }}><span style={{ fontSize:13, color:"#6B7280" }}>{k}</span><span style={{ fontSize:13, fontWeight:600, maxWidth:"55%", textAlign:"right" }}>{v}</span></div>
          ))}
          {selected.observaciones&&<div style={{ marginTop:10, background:"#F5F3FF", borderRadius:10, padding:10 }}><p style={{ margin:0, fontSize:12, fontWeight:700, color:"#6B7280" }}>OBSERVACIONES</p><p style={{ margin:"4px 0 0", fontSize:13 }}>{selected.observaciones}</p></div>}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button style={{ flex:1, background:"#EDE9FE", color:"#5B21B6", border:"none", borderRadius:14, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer" }} onClick={()=>setEditando(selected)}>✏️ Editar</button>
          {currentUser.role==="admin"&&<button style={{ flex:1, background:"#FEE2E2", color:"#991B1B", border:"none", borderRadius:14, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer" }} onClick={()=>{onDelete(selected.id);setSelected(null);}}>🗑️ Eliminar</button>}
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>{currentUser.role==="admin"?"Todos los Registros":"Mis Registros"}</h2><p style={styles.headerSub}>{filtered.length} electores</p></div></div>
      <div style={{ ...styles.content, paddingTop:12 }}>
        <input style={styles.inputNormal} placeholder="🔍 Buscar por nombre, cédula o barrio..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:6, marginBottom:8, overflowX:"auto", paddingBottom:4 }}>
          {["Todos","Si apoya","Indeciso","No apoya"].map(op=>(<button key={op} onClick={()=>setFilterIntencion(op)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filterIntencion===op?"#7C3AED":"#DDD6FE"}`, background:filterIntencion===op?"#7C3AED":"#FFF", color:filterIntencion===op?"#FFF":"#6B7280", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{op}</button>))}
        </div>
        {currentUser.role==="admin"&&(
          <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
            <button onClick={()=>setFilterLider("Todos")} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filterLider==="Todos"?"#EA580C":"#DDD6FE"}`, background:filterLider==="Todos"?"#EA580C":"#FFF", color:filterLider==="Todos"?"#FFF":"#6B7280", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>👥 Todos los líderes</button>
            {lideres.map(l=>(<button key={l} onClick={()=>setFilterLider(l)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filterLider===l?"#EA580C":"#DDD6FE"}`, background:filterLider===l?"#EA580C":"#FFF", color:filterLider===l?"#FFF":"#6B7280", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>👤 {l}</button>))}
          </div>
        )}
        {filtered.length===0?(<div style={{ textAlign:"center", padding:"40px 20px", color:"#6B7280" }}><div style={{ fontSize:40, marginBottom:12 }}>🔍</div><p>No se encontraron registros</p></div>)
        :filtered.map(e=>(
          <div key={e.id} style={{ ...styles.card, cursor:"pointer" }} onClick={()=>setSelected(e)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start" }}>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:14, fontWeight:800 }}>{e.nombre}</p><p style={{ margin:"2px 0", fontSize:12, color:"#6B7280" }}>CC: {e.cedula} · {e.barrio}</p><p style={{ margin:"2px 0", fontSize:11, color:"#6B7280" }}>👤 {e.lider} · Mesa {e.mesaVotacion}</p></div>
              <span style={styles.badge(e.intencion)}>{e.intencion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== CAMBIAR CONTRASEÑA =====================
function CambiarPasswordScreen({ currentUser, onBack, onUpdate }) {
  const [form,setForm]=useState({actual:"",nueva:"",confirmar:""}); const [error,setError]=useState(""); const [success,setSuccess]=useState(false);
  const handleCambiar=()=>{setError("");if(!form.actual||!form.nueva||!form.confirmar){setError("Todos los campos son obligatorios");return;}const users=getUsers();const user=users.find(u=>u.id===currentUser.id);if(user.password!==form.actual){setError("La contraseña actual es incorrecta");return;}if(form.nueva.length<6){setError("La nueva contraseña debe tener mínimo 6 caracteres");return;}if(form.nueva!==form.confirmar){setError("Las contraseñas nuevas no coinciden");return;}const updated=users.map(u=>u.id===currentUser.id?{...u,password:form.nueva}:u);saveUsers(updated);onUpdate({...currentUser,password:form.nueva});setSuccess(true);};
  if(success) return (<div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:40 }}><div style={{ fontSize:60, marginBottom:16 }}>✅</div><h2 style={{ color:"#7C3AED", fontWeight:900, textAlign:"center" }}>¡Contraseña Actualizada!</h2><button style={{ ...styles.btnPrimary, marginTop:20, width:"auto", padding:"12px 30px" }} onClick={onBack}>Volver</button></div>);
  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Cambiar Contraseña</h2><p style={styles.headerSub}>{currentUser.nombre}</p></div></div>
      <div style={styles.content}>
        <label style={styles.label}>Contraseña Actual</label><input style={styles.inputNormal} type="password" placeholder="Tu contraseña actual" value={form.actual} onChange={e=>setForm(f=>({...f,actual:e.target.value}))} />
        <label style={styles.label}>Nueva Contraseña</label><input style={styles.inputNormal} type="password" placeholder="Mínimo 6 caracteres" value={form.nueva} onChange={e=>setForm(f=>({...f,nueva:e.target.value}))} />
        <label style={styles.label}>Confirmar Nueva Contraseña</label><input style={styles.inputNormal} type="password" placeholder="Repite la nueva contraseña" value={form.confirmar} onChange={e=>setForm(f=>({...f,confirmar:e.target.value}))} />
        {error&&<p style={{ color:"#EF4444", fontSize:13, textAlign:"center", marginBottom:10, background:"#FEE2E2", padding:"8px 12px", borderRadius:10 }}>{error}</p>}
        <button style={styles.btnPrimary} onClick={handleCambiar}>🔐 Actualizar Contraseña</button>
      </div>
    </div>
  );
}

// ===================== ADMIN =====================
function AdminScreen({ currentUser, electores, users, onBack, onUsersUpdate }) {
  const [tab,setTab]=useState("stats");
  const [sheetsMsg,setSheetsMsg]=useState(""); const [syncing,setSyncing]=useState(false);
  const [editingUser,setEditingUser]=useState(null); const [editForm,setEditForm]=useState({}); const [editError,setEditError]=useState("");
  const [newUser,setNewUser]=useState({nombre:"",email:"",username:"",password:"",role:"lider"}); const [newUserMsg,setNewUserMsg]=useState("");

  const totalSiApoya=electores.filter(e=>e.intencion==="Si apoya").length;
  const totalIndeciso=electores.filter(e=>e.intencion==="Indeciso").length;
  const totalNoApoya=electores.filter(e=>e.intencion==="No apoya").length;
  const lideres=users.filter(u=>u.role==="lider");
  const porLider=lideres.map(u=>({nombre:u.nombre,username:u.username,count:electores.filter(e=>e.usuarioRegistro===u.username).length,activo:u.activo}));
  const barrios=[...new Set(electores.map(e=>e.barrio))].map(b=>({barrio:b,count:electores.filter(e=>e.barrio===b).length})).sort((a,b)=>b.count-a.count);
  const comunas=[...new Set(electores.map(e=>e.comunaCorregimiento).filter(Boolean))].map(c=>({comuna:c,count:electores.filter(e=>e.comunaCorregimiento===c).length})).sort((a,b)=>b.count-a.count);

  const handleSync=async()=>{
    setSyncing(true);setSheetsMsg("");
    try{
      // Primero descarga lo que hay en Sheets para no borrar datos de otros lideres
      const sheetElectores = await getFromSheets("BASE ELECTORAL");
      let todosElectores = [...electores];
      if(sheetElectores && sheetElectores.length > 0) {
        const parsed = sheetElectores.map(rowToElector);
        parsed.forEach(se => {
          if(!todosElectores.find(e=>String(e.id)===String(se.id))) todosElectores.push(se);
        });
      }
      await syncElectores(todosElectores);
      await syncUsuariosFull(users);
      setSheetsMsg("✅ Todo sincronizado correctamente con Google Sheets.");
    }catch{
      setSheetsMsg("⚠️ Solicitud enviada. Revisa tu hoja.");
    }
    setSyncing(false);
  };

  const toggleUser=(id)=>{const updated=users.map(u=>u.id===id?{...u,activo:!u.activo}:u);onUsersUpdate(updated);};
  const crearUsuario=()=>{
    setNewUserMsg("");
    if(!newUser.nombre||!newUser.email||!newUser.username||!newUser.password){setNewUserMsg("❌ Todos los campos son obligatorios");return;}
    if(newUser.password.length<6){setNewUserMsg("❌ Contraseña mínimo 6 caracteres");return;}
    if(users.find(u=>u.username.toLowerCase()===newUser.username.toLowerCase())){setNewUserMsg("❌ Ese usuario ya existe");return;}
    const nu={id:Date.now(),username:newUser.username.toLowerCase(),password:newUser.password,role:newUser.role,nombre:newUser.nombre.toUpperCase(),email:newUser.email.toLowerCase(),activo:true,fechaRegistro:new Date().toLocaleString("es-CO")};
    const updated=[...users,nu];
    onUsersUpdate(updated);
    upsertUsuario(nu);
    setNewUser({nombre:"",email:"",username:"",password:"",role:"lider"});
    setNewUserMsg("✅ Usuario creado exitosamente");
    setTimeout(()=>setNewUserMsg(""),3000);
  };
  const startEdit=(u)=>{setEditingUser(u.id);setEditForm({nombre:u.nombre,email:u.email,username:u.username,newPassword:"",role:u.role});setEditError("");};
  const saveEdit=()=>{
    if(!editForm.nombre||!editForm.email||!editForm.username){setEditError("Nombre, email y usuario son obligatorios");return;}
    const updated=users.map(u=>{if(u.id===editingUser){const c={...u,nombre:editForm.nombre.toUpperCase(),email:editForm.email.toLowerCase(),username:editForm.username.toLowerCase(),role:editForm.role};if(editForm.newPassword&&editForm.newPassword.length>=6)c.password=editForm.newPassword;return c;}return u;});
    onUsersUpdate(updated);
    const editedUser=updated.find(u=>u.id===editingUser);
    if(editedUser&&editedUser.role!=="admin") upsertUsuario(editedUser);
    setEditingUser(null);
  };

  if(editingUser) return (
    <div>
      <div style={styles.header}><button onClick={()=>setEditingUser(null)} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Editar Usuario</h2></div></div>
      <div style={styles.content}>
        <label style={styles.label}>Nombre Completo</label><input style={styles.input} value={editForm.nombre} onChange={e=>setEditForm(f=>({...f,nombre:e.target.value}))} />
        <label style={styles.label}>Correo Electrónico</label><input style={styles.inputNormal} type="email" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} />
        <label style={styles.label}>Usuario</label><input style={styles.inputNormal} value={editForm.username} onChange={e=>setEditForm(f=>({...f,username:e.target.value}))} />
        <label style={styles.label}>Nueva Contraseña (vacío = no cambiar)</label><input style={styles.inputNormal} type="password" placeholder="Mínimo 6 caracteres" value={editForm.newPassword} onChange={e=>setEditForm(f=>({...f,newPassword:e.target.value}))} />
        <label style={styles.label}>Rol</label><select style={styles.inputNormal} value={editForm.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))}><option value="lider">Líder</option><option value="admin">Administrador</option></select>
        {editError&&<p style={{ color:"#EF4444", fontSize:13, background:"#FEE2E2", padding:"8px 12px", borderRadius:10, marginBottom:10 }}>{editError}</p>}
        <button style={styles.btnPrimary} onClick={saveEdit}>💾 Guardar Cambios</button>
        <button style={styles.btnOutline} onClick={()=>setEditingUser(null)}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={styles.header}><button onClick={onBack} style={{ background:"none", border:"none", color:"#FFF", fontSize:22, cursor:"pointer" }}>←</button><div><h2 style={{ ...styles.headerTitle, fontSize:16 }}>Panel Administrador</h2><p style={styles.headerSub}>Control total del sistema</p></div></div>
      <div style={{ display:"flex", padding:"12px 16px 0", gap:4, background:"#F5F3FF" }}>
        {[["stats","📊"],["lideres","👥"],["sheets","📤"],["usuarios","👤"],["mapa","🗺️"]].map(([key,icon])=>(<button key={key} style={styles.tab(tab===key)} onClick={()=>setTab(key)}>{icon}</button>))}
      </div>
      <div style={styles.content}>

        {tab==="stats"&&<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[["TOTAL",electores.length,"#EDE9FE","#5B21B6"],["SI APOYA",totalSiApoya,"#D1FAE5","#065F46"],["INDECISOS",totalIndeciso,"#FEF3C7","#92400E"],["NO APOYAN",totalNoApoya,"#FEE2E2","#991B1B"]].map(([label,val,bg,color])=>(<div key={label} style={{ background:bg, borderRadius:14, padding:14, textAlign:"center" }}><p style={{ margin:0, fontSize:11, fontWeight:700, color }}>{label}</p><p style={{ margin:"4px 0 0", fontSize:28, fontWeight:900, color }}>{val}</p></div>))}
          </div>
          <div style={styles.card}><h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#7C3AED" }}>REGISTROS POR LÍDER</h4>{porLider.map(({nombre,count})=>(<div key={nombre} style={{ marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:13 }}>{nombre}</span><span style={{ fontSize:13, fontWeight:700, color:"#7C3AED" }}>{count}</span></div><div style={{ height:6, background:"#DDD6FE", borderRadius:3 }}><div style={{ height:"100%", width:`${electores.length>0?(count/electores.length)*100:0}%`, background:"#7C3AED", borderRadius:3 }} /></div></div>))}</div>
          <div style={styles.card}><h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#EA580C" }}>POR BARRIO</h4>{barrios.map(({barrio,count})=>(<div key={barrio} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #DDD6FE" }}><span style={{ fontSize:13 }}>{barrio}</span><span style={{ background:"#FFF7ED", color:"#C2410C", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{count}</span></div>))}</div>
          <div style={styles.card}><h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#7C3AED" }}>POR COMUNA</h4>{comunas.map(({comuna,count})=>(<div key={comuna} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #DDD6FE" }}><span style={{ fontSize:13 }}>{comuna}</span><span style={{ background:"#EDE9FE", color:"#5B21B6", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{count}</span></div>))}</div>
          <button style={styles.btnPrimary} onClick={()=>exportExcel(electores)}>📥 Exportar Excel con pestañas</button>
        </>}

        {tab==="lideres"&&<>
          <div style={{ background:"#EDE9FE", borderRadius:12, padding:12, marginBottom:14 }}>
            <p style={{ margin:0, fontSize:13, color:"#5B21B6", fontWeight:700 }}>👥 LÍDERES — {lideres.length} en total</p>
          </div>
          {lideres.length===0?<div style={{ textAlign:"center", padding:40, color:"#6B7280" }}><p>No hay líderes registrados aún</p></div>
          :lideres.map(u=>(
            <div key={u.id} style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:800, fontSize:15 }}>{u.nombre}</p>
                  <p style={{ margin:"2px 0", fontSize:12, color:"#6B7280" }}>@{u.username} · {u.email}</p>
                  <p style={{ margin:"2px 0", fontSize:11, color:"#6B7280" }}>Registrado: {u.fechaRegistro||"—"}</p>
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    <span style={{ background:"#EDE9FE", color:"#5B21B6", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>Líder</span>
                    <span style={{ background:u.activo?"#D1FAE5":"#FEE2E2", color:u.activo?"#065F46":"#991B1B", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{u.activo?"Activo":"Inactivo"}</span>
                  </div>
                </div>
                <div style={{ textAlign:"right", display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                  <p style={{ margin:0, fontSize:22, fontWeight:900, color:"#7C3AED" }}>{electores.filter(e=>e.usuarioRegistro===u.username).length}</p>
                  <p style={{ margin:0, fontSize:10, color:"#6B7280" }}>registros</p>
                  <button onClick={()=>startEdit(u)} style={{ background:"#EDE9FE", color:"#5B21B6", border:"none", borderRadius:10, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Editar</button>
                  <button onClick={()=>toggleUser(u.id)} style={{ ...u.activo?styles.btnDanger:styles.btnSuccess, fontSize:11, padding:"5px 10px" }}>{u.activo?"Desactivar":"Activar"}</button>
                  <button onClick={()=>{ if(window.confirm("¿Eliminar líder "+u.nombre+"? Sus registros se mantendrán.")){const upd=users.filter(x=>x.id!==u.id);onUsersUpdate(upd);syncUsuariosFull(upd);}}} style={{ background:"#FEE2E2", color:"#991B1B", border:"none", borderRadius:10, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑️ Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </>}

        {tab==="sheets"&&(
          <div style={styles.card}>
            <h4 style={{ margin:"0 0 8px", fontSize:14, fontWeight:800, color:"#7C3AED" }}>📤 GOOGLE SHEETS</h4>
            <div style={{ background:"#D1FAE5", borderRadius:12, padding:12, marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, color:"#065F46", fontWeight:700 }}>✅ Sincronización automática activa</p>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"#065F46" }}>Cada registro nuevo se envía a Sheets sin borrar los de otros líderes. Usa el botón solo si necesitas forzar una sincronización completa.</p>
            </div>
            {sheetsMsg&&<p style={{ fontSize:13, marginBottom:10, padding:"8px 12px", borderRadius:10, background:sheetsMsg.includes("✅")?"#D1FAE5":"#FEF3C7", color:sheetsMsg.includes("✅")?"#065F46":"#92400E" }}>{sheetsMsg}</p>}
            <button style={{ ...styles.btnPrimary, opacity:syncing?0.7:1 }} onClick={handleSync} disabled={syncing}>{syncing?"⏳ Sincronizando...":"🔄 Sincronizar todo con Sheets"}</button>
            <button style={styles.btnSecondary} onClick={()=>exportExcel(electores)}>📥 Exportar Excel con pestañas</button>
          </div>
        )}

        {tab==="usuarios"&&<>
          <div style={styles.card}>
            <h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#7C3AED" }}>➕ CREAR NUEVO USUARIO</h4>
            <label style={styles.label}>Nombre Completo</label><input style={styles.input} placeholder="EJ: PEDRO JIMÉNEZ" value={newUser.nombre} onChange={e=>setNewUser(p=>({...p,nombre:e.target.value}))} />
            <label style={styles.label}>Correo Electrónico</label><input style={styles.inputNormal} type="email" placeholder="correo@gmail.com" value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} />
            <label style={styles.label}>Usuario</label><input style={styles.inputNormal} placeholder="pedrojimenez" value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} />
            <label style={styles.label}>Contraseña</label><input style={styles.inputNormal} type="password" placeholder="Mínimo 6 caracteres" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} />
            <label style={styles.label}>Rol</label><select style={styles.inputNormal} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}><option value="lider">Líder / Equipo</option><option value="admin">Administrador</option></select>
            {newUserMsg&&<p style={{ fontSize:13, marginBottom:8, padding:"8px 12px", borderRadius:10, background:newUserMsg.includes("✅")?"#D1FAE5":"#FEE2E2", color:newUserMsg.includes("✅")?"#065F46":"#991B1B" }}>{newUserMsg}</p>}
            <button style={styles.btnPrimary} onClick={crearUsuario}>✅ Crear Usuario</button>
          </div>
          {users.map(u=>(
            <div key={u.id} style={styles.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1 }}><p style={{ margin:0, fontWeight:800, fontSize:15 }}>{u.nombre}</p><p style={{ margin:"2px 0", fontSize:12, color:"#6B7280" }}>@{u.username} · {u.role==="admin"?"Admin":"Líder"}</p><span style={{ background:u.activo?"#D1FAE5":"#FEE2E2", color:u.activo?"#065F46":"#991B1B", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{u.activo?"Activo":"Inactivo"}</span></div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                  <p style={{ margin:0, fontSize:18, fontWeight:900, color:"#7C3AED" }}>{electores.filter(e=>e.usuarioRegistro===u.username).length}</p>
                  <button onClick={()=>startEdit(u)} style={{ background:"#EDE9FE", color:"#5B21B6", border:"none", borderRadius:10, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Editar</button>
                  {u.role!=="admin"&&<button onClick={()=>toggleUser(u.id)} style={{ ...u.activo?styles.btnDanger:styles.btnSuccess, fontSize:11, padding:"5px 10px" }}>{u.activo?"Desactivar":"Activar"}</button>}
                </div>
              </div>
            </div>
          ))}
        </>}

        {tab==="mapa"&&(
          <div style={styles.card}>
            <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#7C3AED" }}>MAPA GPS DE ELECTORES</h4>
            <div style={{ background:"#E8F4F8", borderRadius:12, height:220, position:"relative", overflow:"hidden", border:"1px solid #DDD6FE" }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(45deg, #d4e6d4 25%, #e8f4e8 50%, #c8dcc8 75%)", opacity:0.5 }} />
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ position:"relative", width:280, height:180 }}>
                  {electores.map(e=>{const x=((e.lng-(-75.24))/0.02)*280;const y=((4.445-e.lat)/0.015)*180;const colors={"Si apoya":"#16A34A","Indeciso":"#D97706","No apoya":"#DC2626"};return <div key={e.id} title={e.nombre} style={{ position:"absolute", left:Math.max(0,Math.min(270,x)), top:Math.max(0,Math.min(170,y)), width:14, height:14, borderRadius:"50%", background:colors[e.intencion]||"#7C3AED", border:"2px solid white", cursor:"pointer", boxShadow:"0 2px 4px rgba(0,0,0,0.3)" }} />;
                  })}
                </div>
              </div>
              <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(255,255,255,0.9)", borderRadius:8, padding:"6px 10px" }}><p style={{ margin:0, fontSize:10, fontWeight:600 }}>📍 Ibagué, Tolima</p></div>
            </div>
            <div style={{ display:"flex", gap:12, marginTop:10, justifyContent:"center" }}>{[["#16A34A","Si apoya"],["#D97706","Indeciso"],["#DC2626","No apoya"]].map(([c,l])=>(<div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:"50%", background:c }} /><span style={{ fontSize:11 }}>{l}</span></div>))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== APP PRINCIPAL =====================
export default function App() {
  const [currentUser,setCurrentUser]=useState(null);
  const [screen,setScreen]=useState("login");
  const [electores,setElectores]=useState(getElectores());
  const [users,setUsers]=useState(getUsers());
  const [loading,setLoading]=useState(false);

  // Al iniciar sesión carga datos frescos de Sheets
  useEffect(()=>{
    if(currentUser){
      setLoading(true);
      Promise.all([
        getFromSheets("BASE ELECTORAL"),
        getFromSheets("USUARIOS"),
      ]).then(([sheetElectores,sheetUsers])=>{
        if(sheetElectores&&sheetElectores.length>0){
          const parsed=sheetElectores.map(rowToElector);
          setElectores(parsed); saveElectores(parsed);
        }
        // Siempre mergear: mantener admins locales + todos los lideres de Sheets
        const localUsers=getUsers();
        const admins=localUsers.filter(u=>u.role==="admin");
        const merged=[...admins];
        if(sheetUsers&&sheetUsers.length>0){
          const sheetLideres=sheetUsers.map(rowToUser);
          sheetLideres.forEach(sl=>{
            if(!merged.find(u=>u.username===sl.username)) merged.push(sl);
            else{ const idx=merged.findIndex(u=>u.username===sl.username); if(merged[idx].role!=="admin") merged[idx]={...merged[idx],...sl,password:merged[idx].password}; }
          });
        }
        // Tambien incluir lideres locales que no esten en Sheets aun
        localUsers.filter(u=>u.role!=="admin").forEach(lu=>{
          if(!merged.find(u=>u.username===lu.username)) merged.push(lu);
        });
        setUsers(merged); saveUsers(merged);
        setLoading(false);
      });
    }
  },[currentUser]);

  const handleLogin =(user)=>{ setCurrentUser(user); setScreen("inicio"); };

  const recargarDesdeSheets = async () => {
    setLoading(true);
    try {
      const [sheetElectores, sheetUsers] = await Promise.all([
        getFromSheets("BASE ELECTORAL"),
        getFromSheets("USUARIOS"),
      ]);
      if(sheetElectores && sheetElectores.length > 0){
        const parsed = sheetElectores.map(rowToElector);
        setElectores(parsed); saveElectores(parsed);
      }
      const localUsers = getUsers();
      const admins = localUsers.filter(u=>u.role==="admin");
      const merged = [...admins];
      if(sheetUsers && sheetUsers.length > 0){
        const sheetLideres = sheetUsers.map(rowToUser);
        sheetLideres.forEach(sl=>{
          if(!merged.find(u=>u.username===sl.username)) merged.push(sl);
          else{ const idx=merged.findIndex(u=>u.username===sl.username); if(merged[idx].role!=="admin") merged[idx]={...merged[idx],...sl,password:merged[idx].password}; }
        });
      }
      localUsers.filter(u=>u.role!=="admin").forEach(lu=>{
        if(!merged.find(u=>u.username===lu.username)) merged.push(lu);
      });
      setUsers(merged); saveUsers(merged);
    } catch(_) {}
    setLoading(false);
  };
  const handleLogout=()=>{ setCurrentUser(null); setScreen("login"); };

  // ✅ upsert: agrega sin borrar registros de otros líderes
  const handleSaveElector  =(data)=>{ const u=[...electores,data]; setElectores(u); saveElectores(u); upsertElector(data); };
  const handleEditElector  =(data)=>{ const u=electores.map(e=>e.id===data.id?data:e); setElectores(u); saveElectores(u); upsertElector(data); };
  const handleDeleteElector=(id)  =>{ if(window.confirm("¿Eliminar este registro?")){ const u=electores.filter(e=>e.id!==id); setElectores(u); saveElectores(u); deleteElector(id); } };
  const handleUsersUpdate  =(upd) =>{ setUsers(upd); saveUsers(upd); };

  if(screen==="login")        return <LoginScreen onLogin={u=>{const fresh=users.find(x=>x.id===u.id)||u;handleLogin(fresh);}} onGoRegister={()=>setScreen("registerUser")} />;
  if(screen==="registerUser") return <RegisterUserScreen onBack={()=>setScreen("login")} onSuccess={()=>setScreen("login")} />;
  if(!currentUser)            return <LoginScreen onLogin={handleLogin} onGoRegister={()=>setScreen("registerUser")} />;

  if(loading) return (
    <div style={{ ...styles.mobileFrame, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:40 }}>
      <div style={{ fontSize:50, marginBottom:16 }}>🔄</div>
      <h2 style={{ color:"#7C3AED", fontWeight:900, textAlign:"center" }}>Sincronizando...</h2>
      <p style={{ color:"#6B7280", textAlign:"center" }}>Cargando datos desde Google Sheets</p>
    </div>
  );

  return (
    <div style={styles.mobileFrame}>
      {screen==="inicio"    &&<InicioScreen    currentUser={currentUser} electores={electores} onNavigate={setScreen} onRecargar={recargarDesdeSheets} />}
      {screen==="registro"  &&<RegistroScreen  currentUser={currentUser} electores={electores} onSave={handleSaveElector}  onBack={()=>setScreen("inicio")} />}
      {screen==="registros" &&<RegistrosScreen currentUser={currentUser} electores={electores} onBack={()=>setScreen("inicio")} onDelete={handleDeleteElector} onEdit={handleEditElector} />}
      {screen==="admin"&&currentUser.role==="admin"&&<AdminScreen currentUser={currentUser} electores={electores} users={users} onBack={()=>setScreen("inicio")} onUsersUpdate={handleUsersUpdate} />}
      {screen==="password"  &&<CambiarPasswordScreen currentUser={currentUser} onBack={()=>setScreen("inicio")} onUpdate={setCurrentUser} />}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#FFF", borderTop:"1px solid #DDD6FE", display:"flex", padding:"6px 0 8px", zIndex:100 }}>
        {[["inicio","🏠","Inicio"],["registro","➕","Registrar"],["registros","👥","Registros"],["password","🔐","Clave"],...(currentUser.role==="admin"?[["admin","⚙️","Admin"]]:[])]
          .map(([s,icon,label])=>(<button key={s} style={styles.navBtn(screen===s)} onClick={()=>setScreen(s)}><span style={{ fontSize:20 }}>{icon}</span>{label}</button>))}
        <button style={styles.navBtn(false)} onClick={handleLogout}><span style={{ fontSize:20 }}>🚪</span>Salir</button>
      </div>
    </div>
  );
}