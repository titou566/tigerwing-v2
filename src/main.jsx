import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sendMail(data) {
  await fetch("/api/send-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

function App() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    country: "France",
    network: "IVAO",
    network_id: "",
    simulator: "MSFS",
    experience: "Débutant",
    motivation: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .insert([form]);

      if (error) throw error;

      await sendMail({
        to_email: form.email,
        subject: "Candidature TigerWing reçue",
        body: `Bonjour ${form.first_name},

Ta candidature a bien été reçue !

TigerWing VA ✈️`,
      });

      setMessage("✅ Candidature envoyée !");
    } catch (err) {
      setMessage("❌ Erreur : " + err.message);
    }
  };

  return (
    <div className="container">
      <h1>Rejoindre TigerWing</h1>

      <input name="first_name" placeholder="Prénom" onChange={handleChange} />
      <input name="last_name" placeholder="Nom" onChange={handleChange} />
      <input name="nickname" placeholder="Surnom" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />

      <select name="network" onChange={handleChange}>
        <option>IVAO</option>
        <option>VATSIM</option>
      </select>

      <input
        name="network_id"
        placeholder="ID IVAO / CID VATSIM"
        onChange={handleChange}
      />

      <button onClick={handleSubmit}>Envoyer candidature</button>

      <p>{message}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
