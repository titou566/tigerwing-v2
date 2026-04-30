import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

// 🔗 Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 📩 API mail
async function sendMail(data) {
  const res = await fetch("/api/send-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Erreur email");
  }
}

// 🧾 APP
function App() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    network: "IVAO",
    network_id: "",
  });

  const [msg, setMsg] = useState("");

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("Envoi...");

    try {
      // DB
      const { error } = await supabase.from("applications").insert([form]);
      if (error) throw error;

      // MAIL
      await sendMail({
        to_email: form.email,
        subject: "Candidature TigerWing reçue",
        body: `Bonjour ${form.first_name},

Ta candidature a bien été reçue ✈️
Nous allons l'étudier rapidement.

TigerWing`,
      });

      setMsg("✅ Candidature envoyée !");
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Rejoindre TigerWing</h1>

      <form onSubmit={submit}>
        <input name="first_name" placeholder="Prénom" onChange={update} /><br/>
        <input name="last_name" placeholder="Nom" onChange={update} /><br/>
        <input name="nickname" placeholder="Surnom" onChange={update} /><br/>
        <input name="email" placeholder="Email" onChange={update} /><br/>

        <select name="network" onChange={update}>
          <option>IVAO</option>
          <option>VATSIM</option>
        </select><br/>

        <input name="network_id" placeholder="ID IVAO / CID VATSIM" onChange={update} /><br/><br/>

        <button type="submit">Envoyer candidature</button>
      </form>

      <p>{msg}</p>
    </div>
  );
}

// 🔥 RENDER (TRÈS IMPORTANT)
createRoot(document.getElementById("root")).render(<App />);
