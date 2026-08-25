const express = require('express');
const personnelService = require('../services/personnelService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof personnelService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

function parseMatched(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

// GET /api/personnel?room_code=&matched=true|false
router.get('/', async (req, res) => {
  try {
    const personnel = await personnelService.listPersonnel({
      roomCode: req.query.room_code,
      matched: parseMatched(req.query.matched),
    });
    res.json(personnel);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:serviceNumber', async (req, res) => {
  try {
    const person = await personnelService.getPersonnel(req.params.serviceNumber);
    res.json(person);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { service_number, name, phone_number, room_code } = req.body;
    const person = await personnelService.createPersonnel({
      serviceNumber: service_number,
      name,
      phoneNumber: phone_number,
      roomCode: room_code,
    });
    res.status(201).json(person);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:serviceNumber', async (req, res) => {
  try {
    const { name, phone_number, room_code } = req.body;
    const person = await personnelService.updatePersonnel(req.params.serviceNumber, {
      name,
      phoneNumber: phone_number,
      roomCode: room_code,
    });
    res.json(person);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:serviceNumber', async (req, res) => {
  try {
    await personnelService.deletePersonnel(req.params.serviceNumber);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:serviceNumber/match', async (req, res) => {
  try {
    const person = await personnelService.matchPersonnel(req.params.serviceNumber, req.body.rfid_uid);
    res.json(person);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:serviceNumber/match', async (req, res) => {
  try {
    const person = await personnelService.unmatchPersonnel(req.params.serviceNumber);
    res.json(person);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
