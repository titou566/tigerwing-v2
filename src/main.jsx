import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Plane, LogIn, LogOut, UserPlus, Check, X, Trash2, Save,
  Users, Crown, FileText, ShieldCheck, Send
} from "lucide-react";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const CEO_EMAILS = [
  "a.comier78@gmail.com",
  "leonardpoirey.cp@icloud.com"
];

const accounts = [
  { email:"pilote@tigerwing.va", password:"tiger123", role:"pilote", name:"Pilote Demo", callsign:"TWG1896" },
  { email:"admin@tigerwing.va", password:"admin123", role:"admin", name:"Admin Demo", callsign:"TWG900" },
  { email:"ceo@tigerwing.va", password:"ceo123", role:"ceo", name:"CEO Demo", callsign:"TWG001" },
];

function roleOf(email) {
  return CEO_EMAILS.includes(email.toLowerCase()) ? "ceo" : "pilote";
}

function isStaff(user) {
  return user?.role === "admin" || user?.role === "ceo";
}

function isCEO(user) {
  return user?.role === "ceo";
}

async function addMailQueue(app) {
  if (!supabase) return;

  await supabase.from("mail_queue").insert([{
    to_email: app.email,
    subject: "Candidature TigerWing reçue",
    body: `Bonjour ${app.first_name},

Ta candidature TigerWing a bien été reçue.
Notre staff va l'étudier prochainement.

Bons vols,
L'équipe TigerWing`,
    status: "queued",
    related_application_id: app.id || null
  }]);
}

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [plans, setPlans] = useState([]);

  async function refresh() {
    if (!supabase) return;

    const a = await supabase.from("applications").select("*").order("created_at", { ascending:false });
    const p = await supabase.from("flight_plans").select("*").order("created_at", { ascending:false });

    if (!a.error) setApps(a.data || []);
    if (!p.error) setPlans(p.data || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  function login(email, password) {
    const demo = accounts.find(a => a.email === email && a.password === password);

    if (demo) {
      setUser(demo);
      setPage("dashboard");
      return;
    }

    const role = roleOf(email);

    setUser({
      email,
      role,
      name: email.split("@")[0],
      callsign: role === "ceo" ? "TWG001" : "TWG000"
    });

    setPage("dashboard");
  }

  async function addApplication(form) {
    const payload = {
      ...form,
      fullname: `${form.first_name} ${form.last_name}`,
      status: "pending",
      email_status: "queued"
    };

    let saved = { ...payload, id: "local-" + Date.now() };

    if (supabase) {
      const { data, error } = await supabase
        .from("applications")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      saved = data;
      await addMailQueue(saved);
    }

    setApps([saved, ...apps]);
  }

  async function updateApplication(app, status) {
    const patch = { status };

    if (status === "rejected") {
      patch.rejected_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    if (supabase && !String(app.id).startsWith("local")) {
      await supabase.from("applications").update(patch).eq("id", app.id);
    }

    setApps(apps.map(a => a.id === app.id ? { ...a, ...patch } : a));
  }

  async function deleteApplication(app) {
    if (!confirm("Supprimer cette candidature ?")) return;

    if (supabase && !String(app.id).startsWith("local")) {
      await supabase.from("applications").delete().eq("id", app.id);
    }

    setApps(apps.filter(a => a.id !== app.id));
  }

  async function addPlan(form) {
    const payload = {
      ...form,
      pilot_email: user.email,
      pilot_name: user.name,
      status: "pending",
      debrief: ""
    };

    if (supabase) {
      await supabase.from("flight_plans").insert([payload]);
    }

    setPlans([{ ...payload, id:"local-" + Date.now() }, ...plans]);
  }

  async function updatePlan(plan, patch) {
    if (supabase && !String(plan.id).startsWith("local")) {
      await supabase.from("flight_plans").update(patch).eq("id", plan.id);
    }

    setPlans(plans.map(p => p.id === plan.id ? { ...p, ...patch } : p));
  }

  if (page === "home") return <Home setPage={setPage} />;
  if (page === "join") return <Join setPage={setPage} addApplication={addApplication} />;
  if (page === "login") return <Login setPage={setPage} login={login} />;

  return (
    <div className="app">
      <aside>
        <div className="brand">✈ TIGERWING</div>

        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("plans")}>Plans de vol</button>
        <button onClick={() => setPage("fleet")}>Flotte</button>

        {isStaff(user) && <button onClick={() => setPage("admin")}>Candidatures</button>}
        {isCEO(user) && <button onClick={() => setPage("ceo")}>CEO</button>}

        <button onClick={() => { setUser(null); setPage("home"); }}>
          <LogOut size={16}/> Déconnexion
        </button>
      </aside>

      <main>
        <header>
          <h2>TigerWing Crew Center</h2>
          <span>{user.name} — {user.role}</span>
        </header>

        {page === "dashboard" && <Dashboard user={user} plans={plans} />}
        {page === "plans" && <Plans plans={plans} user={user} addPlan={addPlan} updatePlan={updatePlan} />}
        {page === "fleet" && <Fleet />}
        {page === "admin" && <Admin apps={apps} updateApplication={updateApplication} deleteApplication={deleteApplication} />}
        {page === "ceo" && <CEO apps={apps} plans={plans} />}
      </main>
    </div>
  );
}

function Home({ setPage }) {
  return (
    <div className="landing">
      <div className="overlay" />

      <nav className="landing-nav">
        <div className="landing-logo">✈ TIGERWING</div>
        <div>
          <button onClick={() => setPage("login")}>Connexion</button>
          <button className="blue" onClick={() => setPage("join")}>Rejoindre</button>
        </div>
      </nav>

      <section className="landing-content">
        <div className="pill">● SIMULATION AÉRONAUTIQUE</div>

        <h1>
          TIGER<span>WING</span>
        </h1>

        <p>
          Explorez les routes aériennes du monde entier.<br />
          Rejoignez une compagnie virtuelle moderne, premium et ambitieuse.
        </p>

        <button className="cta" onClick={() => setPage("join")}>
          ✈ Rejoindre TigerWing
        </button>
      </section>
    </div>
  );
}

function Join({ setPage, addApplication }) {
  const [form, setForm] = useState({
    first_name:"",
    last_name:"",
    nickname:"",
    email:"",
    country:"France",
    network:"Aucun",
    ivao_id:"",
    vatsim_cid:"",
    simulator:"MSFS",
    experience:"Débutant",
    motivation:""
  });

  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("Envoi...");

    try {
      await addApplication(form);
      setMsg("✅ Candidature envoyée.");
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  }

  return (
    <div className="auth">
      <button className="back" onClick={() => setPage("home")}>← Accueil</button>

      <form className="card big" onSubmit={submit}>
        <h1>Rejoindre TigerWing</h1>

        <div className="grid2">
          <input required placeholder="Prénom" onChange={e => setForm({...form, first_name:e.target.value})}/>
          <input required placeholder="Nom" onChange={e => setForm({...form, last_name:e.target.value})}/>
          <input required placeholder="Surnom" onChange={e => setForm({...form, nickname:e.target.value})}/>
          <input required type="email" placeholder="Email" onChange={e => setForm({...form, email:e.target.value})}/>

          <select onChange={e => setForm({...form, country:e.target.value})}>
            <option>France</option>
            <option>Belgique</option>
            <option>Suisse</option>
            <option>Canada</option>
            <option>Autre</option>
          </select>

          <select onChange={e => setForm({...form, network:e.target.value})}>
            <option>Aucun</option>
            <option>IVAO</option>
            <option>VATSIM</option>
            <option>IVAO + VATSIM</option>
          </select>

          <input placeholder="ID IVAO" onChange={e => setForm({...form, ivao_id:e.target.value})}/>
          <input placeholder="CID VATSIM" onChange={e => setForm({...form, vatsim_cid:e.target.value})}/>

          <select onChange={e => setForm({...form, simulator:e.target.value})}>
            <option>MSFS</option>
            <option>X-Plane</option>
            <option>Prepar3D</option>
          </select>

          <select onChange={e => setForm({...form, experience:e.target.value})}>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Confirmé</option>
            <option>Expert</option>
          </select>
        </div>

        <textarea placeholder="Motivation" onChange={e => setForm({...form, motivation:e.target.value})} />

        <button className="blue">
          <UserPlus size={16}/> Envoyer ma candidature
        </button>

        <p>{msg}</p>
      </form>
    </div>
  );
}

function Login({ setPage, login }) {
  const [email, setEmail] = useState("pilote@tigerwing.va");
  const [password, setPassword] = useState("tiger123");
  const [msg, setMsg] = useState("");

  function submit(e) {
    e.preventDefault();

    try {
      login(email, password);
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  }

  return (
    <div className="auth">
      <button className="back" onClick={() => setPage("home")}>← Accueil</button>

      <form className="card" onSubmit={submit}>
        <h1>Connexion</h1>

        <input value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

        <button className="blue">
          <LogIn size={16}/> Connexion
        </button>

        <small>
          pilote@tigerwing.va / tiger123<br />
          admin@tigerwing.va / admin123<br />
          ceo@tigerwing.va / ceo123<br /><br />
          Tes mails CEO :<br />
          a.comier78@gmail.com<br />
          leonardpoirey.cp@icloud.com
        </small>

        <p>{msg}</p>
      </form>
    </div>
  );
}

function Dashboard({ user, plans }) {
  const shown = user.role === "pilote"
    ? plans.filter(p => p.pilot_email === user.email)
    : plans;

  return (
    <section>
      <h1>Bienvenue, {user.name}</h1>

      <div className="stats">
        <div className="box">Rôle<br/><b>{user.role}</b></div>
        <div className="box">Callsign<br/><b>{user.callsign}</b></div>
        <div className="box">Vols<br/><b>{shown.length}</b></div>
      </div>

      <div className="card">
        <h2>Opérations</h2>
        {shown.map(p => (
          <p key={p.id}>✈ {p.callsign} — {p.departure} → {p.arrival}</p>
        ))}
      </div>
    </section>
  );
}

function Plans({ user, plans, addPlan, updatePlan }) {
  const [form, setForm] = useState({
    callsign:"TWG204",
    departure:"LFPG",
    arrival:"LEMD",
    aircraft:"A320neo",
    route:""
  });

  const [debriefs, setDebriefs] = useState({});

  async function submit(e) {
    e.preventDefault();
    await addPlan(form);
  }

  return (
    <section>
      <h1>Plans de vol</h1>

      <div className="grid2">
        <form className="card" onSubmit={submit}>
          <input value={form.callsign} onChange={e => setForm({...form, callsign:e.target.value})}/>
          <input value={form.departure} onChange={e => setForm({...form, departure:e.target.value})}/>
          <input value={form.arrival} onChange={e => setForm({...form, arrival:e.target.value})}/>
          <input value={form.aircraft} onChange={e => setForm({...form, aircraft:e.target.value})}/>
          <textarea placeholder="Route" onChange={e => setForm({...form, route:e.target.value})}/>
          <button className="blue"><Send size={16}/> Envoyer</button>
        </form>

        <div className="card">
          <h2>Débriefs</h2>

          {plans.map(p => (
            <div className="row" key={p.id}>
              <b>{p.callsign}</b> {p.departure} → {p.arrival}
              <textarea
                placeholder="Débrief pilote"
                value={debriefs[p.id] ?? p.debrief ?? ""}
                onChange={e => setDebriefs({...debriefs, [p.id]:e.target.value})}
              />
              <button onClick={() => updatePlan(p, { debrief: debriefs[p.id] ?? "" })}>
                <Save size={14}/> Sauver
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Admin({ apps, updateApplication, deleteApplication }) {
  return (
    <section>
      <h1>Candidatures</h1>

      <div className="card">
        {apps.length === 0 && <p>Aucune candidature.</p>}

        {apps.map(app => (
          <div className="row" key={app.id}>
            <b>{app.first_name} {app.last_name}</b>
            <span>{app.email} — {app.network} — {app.status}</span>
            <p>{app.motivation}</p>

            <button onClick={() => updateApplication(app, "accepted")}>
              <Check size={14}/> Accepter
            </button>

            <button onClick={() => updateApplication(app, "rejected")}>
              <X size={14}/> Refuser
            </button>

            <button onClick={() => deleteApplication(app)}>
              <Trash2 size={14}/> Supprimer
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CEO({ apps, plans }) {
  return (
    <section>
      <h1>Direction générale</h1>

      <div className="stats">
        <div className="box">Candidatures<br/><b>{apps.length}</b></div>
        <div className="box">Vols<br/><b>{plans.length}</b></div>
        <div className="box">CEO<br/><b>2</b></div>
      </div>
    </section>
  );
}

function Fleet() {
  return (
    <section>
      <h1>Flotte TigerWing</h1>

      <div className="fleet">
        <div className="plane-card">A320neo</div>
        <div className="plane-card">A350-900</div>
        <div className="plane-card">B787-9</div>
        <div className="plane-card">B777-300ER</div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
