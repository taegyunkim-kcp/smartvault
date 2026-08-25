const express = require('express');
const eventService = require('../services/eventService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof eventService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/rfid', async (req, res) => {
  try {
    res.json(
      await eventService.listRfidEvents({
        roomCode: req.query.room_code,
        gatewayId: req.query.gateway_id,
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit,
        offset: req.query.offset,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/door', async (req, res) => {
  try {
    res.json(
      await eventService.listDoorEvents({
        roomCode: req.query.room_code,
        gatewayId: req.query.gateway_id,
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit,
        offset: req.query.offset,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/status', async (req, res) => {
  try {
    res.json(
      await eventService.listStatusEvents({
        statusType: req.query.status_type,
        roomCode: req.query.room_code,
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit,
        offset: req.query.offset,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
