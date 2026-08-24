const express = require('express');
const roomService = require('../services/roomService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof roomService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

// GET /api/rooms?building_code=xxx
router.get('/', async (req, res) => {
  try {
    const rooms = await roomService.listRooms(req.query.building_code);
    res.json(rooms);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:roomCode', async (req, res) => {
  try {
    const room = await roomService.getRoom(req.params.roomCode);
    res.json(room);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { room_code, building_code, room_name } = req.body;
    const room = await roomService.createRoom({
      roomCode: room_code,
      buildingCode: building_code,
      roomName: room_name,
    });
    res.status(201).json(room);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:roomCode', async (req, res) => {
  try {
    const { room_name } = req.body;
    const room = await roomService.updateRoom(req.params.roomCode, { roomName: room_name });
    res.json(room);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:roomCode', async (req, res) => {
  try {
    await roomService.deleteRoom(req.params.roomCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
