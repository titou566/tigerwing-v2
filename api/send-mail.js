async function sendMail(data) {
  try {
    const res = await fetch("/api/send-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const text = await res.text();
    console.log("API RESPONSE:", text);

    if (!res.ok) {
      throw new Error("Erreur API mail");
    }

  } catch (err) {
    console.error("MAIL ERROR:", err);
    throw err;
  }
}
