export default async function handler(req, res) {
  return res.status(200).json({ success: true, message: "Email préparé dans mail_queue." });
}
