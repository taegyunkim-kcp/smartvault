const express = require('express');
const bridgeAuth = require('../middlewares/bridgeAuth');
const ingestService = require('../services/ingestService');

const router = express.Router();

router.post('/events', bridgeAuth, async (req, res) => {
  try {
    const result = await ingestService.ingestEvents(req.body.events);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ingestService.ServiceError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
