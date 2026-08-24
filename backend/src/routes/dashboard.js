const express = require('express');
const dashboardService = require('../services/dashboardService');

const router = express.Router();

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/bases', async (req, res) => {
  try {
    res.json(await dashboardService.getBaseSummaries());
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/buildings', async (req, res) => {
  try {
    res.json(await dashboardService.getBuildingSummaries(req.query.base_code));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/rooms', async (req, res) => {
  try {
    res.json(await dashboardService.getRoomSummaries(req.query.building_code));
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
