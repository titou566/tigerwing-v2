export default async function handler(req, res) {
  // Autoriser seulement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "RESEND_API_KEY manquante dans Vercel"
      });
    }

    const { to_email, subject, body } = req.body;

    // Vérif des champs
    if (!to_email || !subject || !body) {
      return res.status(400).json({
        error: "Champs manquants (to_email, subject, body)"
      });
    }

    // Envoi avec Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "TigerWing <onboarding@resend.dev>",
        to: [to_email],
        subject: subject,
        text: body
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erreur Resend",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
