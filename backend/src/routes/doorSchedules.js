const express = require('express');
const doorScheduleService = require('../services/doorScheduleService');
const doorPolicyService = require('../services/doorPolicyService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof doorScheduleService.ServiceError || err instanceof doorPolicyService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

// GET /api/door-schedules/effective?room_code= — 관리자 화면용. doorPolicyService의 상속 조회
// 로직을 그대로 재사용하되, /api/bridge/policy와 달리 게이트웨이 브리지 비밀키(bridgeAuth) 없이
// 접근 가능해야 한다 — 브라우저 세션이 그 키를 들고 있으면 안 되기 때문에 별도 라우트로 노출.
router.get('/effective', async (req, res) => {
  try {
    res.json(await doorPolicyService.getEffectivePolicy(req.query.room_code));
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/door-schedules?scope_type=&scope_code=
router.get('/', async (req, res) => {
  try {
    const schedule = await doorScheduleService.getSchedule(req.query.scope_type, req.query.scope_code);
    res.json(schedule);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:scopeType/:scopeCode', async (req, res) => {
  try {
    const schedule = await doorScheduleService.saveSchedule(req.params.scopeType, req.params.scopeCode, {
      weekSlots: req.body.week_slots,
      basedOnTemplate: req.body.based_on_template,
    });
    res.json(schedule);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:scopeType/:scopeCode/reset', async (req, res) => {
  try {
    const schedule = await doorScheduleService.resetFromTemplate(
      req.params.scopeType,
      req.params.scopeCode,
      req.body.template_code
    );
    res.json(schedule);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:scopeType/:scopeCode', async (req, res) => {
  try {
    await doorScheduleService.deleteSchedule(req.params.scopeType, req.params.scopeCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
