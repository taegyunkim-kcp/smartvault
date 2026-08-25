const express = require('express');
const bridgeAuth = require('../middlewares/bridgeAuth');
const doorPolicyService = require('../services/doorPolicyService');

const router = express.Router();

router.get('/policy', bridgeAuth, async (req, res) => {
  try {
    const result = await doorPolicyService.getEffectivePolicy(req.query.room_code);
    res.json(result);
  } catch (err) {
    if (err instanceof doorPolicyService.ServiceError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
