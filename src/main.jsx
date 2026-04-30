import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

// 🔥 SÉCURITÉ ANTI PAGE BLANCHE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase non configuré");
}

const supabase = createClient(
  supabaseUrl || "https://test.supabase.co",
  supabaseKey || "test"
);
