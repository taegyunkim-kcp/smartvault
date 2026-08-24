const express = require('express');
const buildingService = require('../services/buildingService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof buildingService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

// GET /api/buildings?base_code=xxx
router.get('/', async (req, res) => {
  try {
    const buildings = await buildingService.listBuildings(req.query.base_code);
    res.json(buildings);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:buildingCode', async (req, res) => {
  try {
    const building = await buildingService.getBuilding(req.params.buildingCode);
    res.json(building);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { building_code, base_code, building_name } = req.body;
    const building = await buildingService.createBuilding({
      buildingCode: building_code,
      baseCode: base_code,
      buildingName: building_name,
    });
    res.status(201).json(building);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:buildingCode', async (req, res) => {
  try {
    const { building_name } = req.body;
    const building = await buildingService.updateBuilding(req.params.buildingCode, {
      buildingName: building_name,
    });
    res.json(building);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:buildingCode', async (req, res) => {
  try {
    await buildingService.deleteBuilding(req.params.buildingCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
