import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Plane, Crown, ShieldCheck, Users, FileText, LogOut, UserPlus, Trash2, Ban, Save } from "lucide-react";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const accounts = [
  { email:"pilote@tigerwing.va", password:"tiger123", role:"pilote", name:"Antoine Martin", callsign:"TWG1896", rank:"First Officer", hours:42, flights:18 },
  { email:"admin@tigerwing.va", password:"admin123", role:"admin", name:"Julie Moreau", callsign:"TWG900", rank:"Commandant", hours:210, flights:81 },
  { email:"ceo@tigerwing.va", password:"ceo123", role:"ceo", name:"Alexandre Leroy", callsign:"TWG001", rank:"Executive Captain", hours:980, flights:412 }
];

const demoPlans = [
  { id:"demo1", callsign:"TWG204", pilot_email:"pilote@tigerwing.va", pilot_name:"Antoine Martin", departure:"LFPG", arrival:"LEMD", aircraft:"A320neo", route:"OKASI UN860 PPN", debrief:"", status:"accepted" }
];

function isStaff(u){ return u?.role === "admin" || u?.role === "ceo"; }
function isCEO(u){ return u?.role === "ceo"; }

async function queueMail(app, type="received"){
  if(!supabase) return;
  let subject = "Candidature TigerWing reçue";
  let body = `Bonjour ${app.first_name},\n\nTa candidature TigerWing a bien été reçue.\nNotre staff va l'étudier prochainement.\n\nBons vols,\nL'équipe TigerWing`;

  if(type === "accepted"){
    subject = "Candidature TigerWing acceptée";
    body = `Bonjour ${app.first_name},\n\nBonne nouvelle : ta candidature TigerWing est acceptée.\nBienvenue chez TigerWing.\n\nBons vols,\nL'équipe TigerWing`;
  }

  if(type === "rejected"){
    subject = "Candidature TigerWing";
    body = `Bonjour ${app.first_name},\n\nTa candidature n'a pas été retenue pour le moment.\nTu pourras toutefois repostuler dans 1 semaine.\n\nBons vols,\nL'équipe TigerWing`;
  }

  await supabase.from("mail_queue").insert([{
    to_email: app.email,
    subject,
    body,
    status:"queued",
    related_application_id: app.id || null
  }]);
}

function App(){
  const [page,setPage] = useState("home");
  const [user,setUser] = useState(null);
  const [apps,setApps] = useState([]);
  const [plans,setPlans] = useState(demoPlans);
  const [pilots,setPilots] = useState(accounts);

  async function refresh(){
    if(!supabase) return;
    const a = await supabase.from("applications").select("*").order("created_at",{ascending:false});
    const p = await supabase.from("flight_plans").select("*").order("created_at",{ascending:false});
    const pi = await supabase.from("pilots").select("*").order("created_at",{ascending:false});
    if(!a.error) setApps(a.data || []);
    if(!p.error && p.data?.length) setPlans(p.data);
    if(!pi.error && pi.data?.length) setPilots(pi.data);
  }

  useEffect(()=>{ refresh(); },[]);

  function login(email,password){
    const found = accounts.find(a => a.email === email && a.password === password);
    if(!found) throw new Error("Identifiants incorrects");
    setUser(found);
    setPage("dashboard");
  }

  async function addApplication(form){
    const payload = {
      ...form,
      fullname:`${form.first_name} ${form.last_name}`,
      status:"pending",
      email_status:"queued"
    };

    let saved = {...payload, id:"local-"+Date.now()};

    if(supabase){
      const {data,error} = await supabase.from("applications").insert([payload]).select().single();
      if(error) throw error;
      saved = data;
      await queueMail(saved, "received");
    }

    setApps([saved, ...apps]);
  }

  async function setApplicationStatus(app,status){
    const patch = { status };
    if(status === "rejected") patch.rejected_until = new Date(Date.now()+7*24*60*60*1000).toISOString();

    if(supabase && !String(app.id).startsWith("local-")){
      await supabase.from("applications").update(patch).eq("id",app.id);
      await queueMail({...app,...patch}, status === "accepted" ? "accepted" : "rejected");
    }

    setApps(apps.map(a => a.id === app.id ? {...a,...patch} : a));
  }

  async function deleteApplication(app){
    if(!confirm("Supprimer cette candidature ?")) return;
    if(supabase && !String(app.id).startsWith("local-")) await supabase.from("applications").delete().eq("id",app.id);
    setApps(apps.filter(a => a.id !== app.id));
  }

  async function addPlan(form){
    const payload = {...form, pilot_email:user.email, pilot_name:user.name, status:"pending", debrief:""};
    if(supabase) await supabase.from("flight_plans").insert([payload]);
    setPlans([{...payload,id:"localplan-"+Date.now()},...plans]);
  }

  async function updatePlan(plan,patch){
    if(supabase && !String(plan.id).startsWith("local")) await supabase.from("flight_plans").update(patch).eq("id",plan.id);
    setPlans(plans.map(p => p.id === plan.id ? {...p,...patch} : p));
  }

  async function deletePlan(plan){
    if(!confirm("Supprimer ce vol ?")) return;
    if(supabase && !String(plan.id).startsWith("local")) await supabase.from("flight_plans").delete().eq("id",plan.id);
    setPlans(plans.filter(p => p.id !== plan.id));
  }

  if(page==="home") return <Home setPage={setPage}/>;
  if(page==="join") return <Join setPage={setPage} addApplication={addApplication}/>;
  if(page==="login") return <Login setPage={setPage} login={login}/>;

  return (
    <div className="app">
      <aside>
        <div className="brand">🟡 TIGERWING</div>
        <button onClick={()=>setPage("dashboard")}>Dashboard</button>
        <button onClick={()=>setPage("plans")}>Plans de vol</button>
        <button onClick={()=>setPage("fleet")}>Flotte</button>
        {isStaff(user) && <button onClick={()=>setPage("admin")}>Candidatures</button>}
        {isStaff(user) && <button onClick={()=>setPage("staffplans")}>Gestion vols</button>}
        {isStaff(user) && <button onClick={()=>setPage("pilots")}>Pilotes / bans</button>}
        {isCEO(user) && <button onClick={()=>setPage("ceo")}>CEO</button>}
        <button onClick={()=>{setUser(null);setPage("home")}}><LogOut size={16}/> Déconnexion</button>
      </aside>

      <main>
        <header>
          <h2>TigerWing Crew Center</h2>
          <span>{supabase ? "Supabase connecté" : "Mode local"} — {user.name}</span>
        </header>

        {page==="dashboard" && <Dashboard user={user} plans={plans}/>}
        {page==="plans" && <Plans user={user} plans={plans} addPlan={addPlan} updatePlan={updatePlan}/>}
        {page==="fleet" && <Fleet/>}
        {page==="admin" && <Applications apps={apps} setApplicationStatus={setApplicationStatus} deleteApplication={deleteApplication}/>}
        {page==="staffplans" && <StaffPlans plans={plans} updatePlan={updatePlan} deletePlan={deletePlan}/>}
        {page==="pilots" && <Pilots pilots={pilots}/>}
        {page==="ceo" && <CEO apps={apps} plans={plans} pilots={pilots}/>}
      </main>
    </div>
  );
}

function Home({setPage}){
  return (
    <div className="home">
      <nav>
        <div className="brand">🟡 TIGERWING</div>
        <div>
          <button onClick={()=>setPage("login")}>Connexion</button>
          <button className="gold" onClick={()=>setPage("join")}>Rejoindre</button>
        </div>
      </nav>
      <section className="hero">
        <h1>TigerWing</h1>
        <p>Aviation virtuelle premium indépendante.</p>
        <button className="gold" onClick={()=>setPage("join")}>Créer ma candidature</button>
        <button onClick={()=>setPage("login")}>Accès pilote</button>
      </section>
    </div>
  );
}

function Join({setPage,addApplication}){
  const [form,setForm] = useState({
    first_name:"", last_name:"", nickname:"", email:"", country:"France",
    network:"Aucun", ivao_id:"", vatsim_cid:"", simulator:"MSFS", experience:"Débutant", motivation:""
  });
  const [msg,setMsg] = useState("");
  const needIvao = form.network === "IVAO" || form.network === "IVAO + VATSIM";
  const needVatsim = form.network === "VATSIM" || form.network === "IVAO + VATSIM";

  async function submit(e){
    e.preventDefault();
    setMsg("Envoi...");
    try{
      await addApplication(form);
      setMsg("✅ Candidature envoyée. Mail préparé dans mail_queue.");
    }catch(err){
      setMsg("❌ " + err.message);
    }
  }

  return (
    <div className="auth">
      <button className="back" onClick={()=>setPage("home")}>← Accueil</button>
      <form onSubmit={submit} className="card big">
        <h1>Rejoindre TigerWing</h1>
        <div className="grid2">
          <input required placeholder="Prénom" value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/>
          <input required placeholder="Nom" value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/>
          <input required placeholder="Surnom" value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/>
          <input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <select value={form.country} onChange={e=>setForm({...form,country:e.target.value})}>
            <option>France</option><option>Belgique</option><option>Suisse</option><option>Canada</option><option>Autre</option>
          </select>
          <select value={form.network} onChange={e=>setForm({...form,network:e.target.value})}>
            <option>Aucun</option><option>IVAO</option><option>VATSIM</option><option>IVAO + VATSIM</option>
          </select>
          {needIvao && <input placeholder="ID IVAO" value={form.ivao_id} onChange={e=>setForm({...form,ivao_id:e.target.value})}/>}
          {needVatsim && <input placeholder="CID VATSIM" value={form.vatsim_cid} onChange={e=>setForm({...form,vatsim_cid:e.target.value})}/>}
          <select value={form.simulator} onChange={e=>setForm({...form,simulator:e.target.value})}>
            <option>MSFS</option><option>X-Plane</option><option>Prepar3D</option>
          </select>
          <select value={form.experience} onChange={e=>setForm({...form,experience:e.target.value})}>
            <option>Débutant</option><option>Intermédiaire</option><option>Confirmé</option><option>Expert</option>
          </select>
        </div>
        <textarea placeholder="Motivation" value={form.motivation} onChange={e=>setForm({...form,motivation:e.target.value})}/>
        <button className="gold"><UserPlus size={16}/> Envoyer ma candidature</button>
        <p>{msg}</p>
      </form>
    </div>
  );
}

function Login({setPage,login}){
  const [email,setEmail] = useState("pilote@tigerwing.va");
  const [password,setPassword] = useState("tiger123");
  const [msg,setMsg] = useState("");

  function submit(e){
    e.preventDefault();
    try{ login(email,password); }
    catch(err){ setMsg("❌ " + err.message); }
  }

  return (
    <div className="auth">
      <button className="back" onClick={()=>setPage("home")}>← Accueil</button>
      <form onSubmit={submit} className="card">
        <h1>Connexion</h1>
        <input value={email} onChange={e=>setEmail(e.target.value)}/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button className="gold"><LogIn/> Se connecter</button>
        <p>{msg}</p>
        <small>pilote@tigerwing.va / tiger123<br/>admin@tigerwing.va / admin123<br/>ceo@tigerwing.va / ceo123</small>
      </form>
    </div>
  );
}

function Dashboard({user,plans}){
  const shown = user.role === "pilote" ? plans.filter(p=>p.pilot_email===user.email) : plans;
  return (
    <section>
      <h1>Bienvenue, {user.name}</h1>
      <div className="stats">
        <div className="box">Callsign<br/><b>{user.callsign}</b></div>
        <div className="box">Grade<br/><b>{user.rank}</b></div>
        <div className="box">Heures<br/><b>{user.hours}h</b></div>
        <div className="box">Vols<br/><b>{user.flights}</b></div>
      </div>
      <div className="card">
        <h2>Mes opérations</h2>
        {shown.map(p=><p key={p.id}>✈️ {p.callsign} — {p.departure} → {p.arrival}</p>)}
      </div>
    </section>
  );
}

function Plans({user,plans,addPlan,updatePlan}){
  const [f,setF] = useState({callsign:"TWG204",departure:"LFPG",arrival:"LEMD",aircraft:"A320neo",route:""});
  const [debrief,setDebrief] = useState({});
  const shown = user.role === "pilote" ? plans.filter(p=>p.pilot_email===user.email) : plans;

  async function submit(e){ e.preventDefault(); await addPlan(f); }

  return (
    <section>
      <h1>Plans de vol</h1>
      <div className="grid2">
        <form className="card" onSubmit={submit}>
          <input value={f.callsign} onChange={e=>setF({...f,callsign:e.target.value})}/>
          <input value={f.departure} onChange={e=>setF({...f,departure:e.target.value})}/>
          <input value={f.arrival} onChange={e=>setF({...f,arrival:e.target.value})}/>
          <input value={f.aircraft} onChange={e=>setF({...f,aircraft:e.target.value})}/>
          <textarea placeholder="Route" value={f.route} onChange={e=>setF({...f,route:e.target.value})}/>
          <button className="gold"><Send size={16}/> Envoyer</button>
        </form>
        <div className="card">
          <h2>Débrief pilote</h2>
          {shown.map(p=><div className="row" key={p.id}>
            <b>{p.callsign}</b> {p.departure} → {p.arrival}
            <textarea placeholder="Débrief" value={debrief[p.id] ?? p.debrief ?? ""} onChange={e=>setDebrief({...debrief,[p.id]:e.target.value})}/>
            <button onClick={()=>updatePlan(p,{debrief:debrief[p.id] ?? ""})}><Save size={14}/> Sauver</button>
          </div>)}
        </div>
      </div>
    </section>
  );
}

function Applications({apps,setApplicationStatus,deleteApplication}){
  return (
    <section>
      <h1>Candidatures</h1>
      <div className="card">
        {apps.length===0 && <p>Aucune candidature.</p>}
        {apps.map(a=><div className="row" key={a.id}>
          <b>{a.first_name} {a.last_name}</b> — {a.email} — {a.network} — {a.status}
          <p>{a.motivation}</p>
          <button onClick={()=>setApplicationStatus(a,"accepted")}><Check size={14}/> Accepter</button>
          <button onClick={()=>setApplicationStatus(a,"rejected")}><X size={14}/> Refuser</button>
          <button onClick={()=>deleteApplication(a)}><Trash2 size={14}/> Supprimer</button>
        </div>)}
      </div>
    </section>
  );
}

function StaffPlans({plans,updatePlan,deletePlan}){
  return (
    <section>
      <h1>Gestion vols</h1>
      <div className="card">
        {plans.map(p=><div className="row" key={p.id}>
          <b>{p.callsign}</b> — {p.pilot_name} — {p.departure} → {p.arrival}
          <p>Débrief : {p.debrief || "Aucun"}</p>
          <button onClick={()=>updatePlan(p,{status:"accepted"})}>Valider</button>
          <button onClick={()=>updatePlan(p,{status:"rejected"})}>Refuser</button>
          <button onClick={()=>deletePlan(p)}>Supprimer</button>
        </div>)}
      </div>
    </section>
  );
}

function Pilots({pilots}){
  return (
    <section>
      <h1>Pilotes / bans</h1>
      <div className="card">
        {pilots.map(p=><p key={p.email}><Users size={14}/> {p.name} — {p.role} — {p.email}</p>)}
        <p>Gestion ban complète à remettre après stabilisation.</p>
      </div>
    </section>
  );
}

function CEO({apps,plans,pilots}){
  return (
    <section>
      <h1>Direction générale</h1>
      <div className="stats">
        <div className="box">Candidatures<br/><b>{apps.length}</b></div>
        <div className="box">Vols<br/><b>{plans.length}</b></div>
        <div className="box">Pilotes<br/><b>{pilots.length}</b></div>
      </div>
    </section>
  );
}

function Fleet(){
  return (
    <section>
      <h1>Flotte</h1>
      <div className="stats">
        <div className="box">A320neo</div>
        <div className="box">A350-900</div>
        <div className="box">B787-9</div>
        <div className="box">B777-300ER</div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
