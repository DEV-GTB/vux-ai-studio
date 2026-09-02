export default function handler(req, res) {
  const requiresAccessCode = Boolean(process.env.APP_ACCESS_CODE);
  res.status(200).json({ requiresAccessCode });
}
