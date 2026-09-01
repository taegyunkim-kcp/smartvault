const express = require('express');
const doorOverrideService = require('../services/doorOverrideService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof doorOverrideService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/', async (req, res) => {
  try {
    res.json(await doorOverrideService.listOverrides(req.query.room_code));
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/door-overrides/active — 방 구분 없이 지금 활성 상태인 즉각 실행 전부.
router.get('/active', async (req, res) => {
  try {
    res.json(await doorOverrideService.listActiveOverrides());
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const override = await doorOverrideService.createOverride({
      roomCode: req.body.room_code,
      durationMinutes: req.body.duration_minutes,
      doorCommand: req.body.door_command,
      applicant: req.body.applicant,
      approver: req.body.approver,
      reason: req.body.reason,
    });
    res.status(201).json(override);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await doorOverrideService.cancelOverride(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
