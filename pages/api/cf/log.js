export default function handler(req, res) {
  const { method } = req;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST');
    return res.status(200).send('ok');
  }
  if (method === 'POST') {
    console.log('ClickFunnels webhook headers:', req.headers);
    console.log('ClickFunnels webhook body:', req.body);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST');
  return res.status(405).end();
}
