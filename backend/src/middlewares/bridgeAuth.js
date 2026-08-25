function bridgeAuth(req, res, next) {
  const configuredKeys = (process.env.BRIDGE_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  const providedKey = req.get('X-Bridge-Api-Key');

  if (!providedKey || !configuredKeys.includes(providedKey)) {
    return res.status(401).json({ error: '인증 실패' });
  }

  next();
}

module.exports = bridgeAuth;
