const express = require('express');
const gatewayService = require('../services/gatewayService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof gatewayService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

// GET /api/gateways?room_code=xxx
router.get('/', async (req, res) => {
  try {
    const gateways = await gatewayService.listGateways(req.query.room_code);
    res.json(gateways);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:gatewayId', async (req, res) => {
  try {
    const gateway = await gatewayService.getGateway(req.params.gatewayId);
    res.json(gateway);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { gateway_id, room_code, reader_count, firmware_version, last_seen_at } = req.body;
    const gateway = await gatewayService.createGateway({
      gatewayId: gateway_id,
      roomCode: room_code,
      readerCount: reader_count,
      firmwareVersion: firmware_version,
      lastSeenAt: last_seen_at,
    });
    res.status(201).json(gateway);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:gatewayId', async (req, res) => {
  try {
    const { room_code, reader_count, firmware_version, last_seen_at } = req.body;
    const gateway = await gatewayService.updateGateway(req.params.gatewayId, {
      roomCode: room_code,
      readerCount: reader_count,
      firmwareVersion: firmware_version,
      lastSeenAt: last_seen_at,
    });
    res.json(gateway);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:gatewayId', async (req, res) => {
  try {
    await gatewayService.deleteGateway(req.params.gatewayId);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
