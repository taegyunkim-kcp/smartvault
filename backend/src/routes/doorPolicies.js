const express = require('express');
const doorPolicyService = require('../services/doorPolicyService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof doorPolicyService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

// GET /api/door-policies/effective?room_code= — 관리자 화면용. 게이트웨이 브리지 비밀키
// (bridgeAuth) 없이 접근 가능해야 해서 /api/bridge/policy와 별도 라우트로 노출.
router.get('/effective', async (req, res) => {
  try {
    res.json(await doorPolicyService.getEffectivePolicy(req.query.room_code));
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/door-policies/temp?scope_type=&scope_code=
router.get('/temp', async (req, res) => {
  try {
    res.json(await doorPolicyService.getTempPolicy(req.query.scope_type, req.query.scope_code));
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/temp/:scopeType/:scopeCode', async (req, res) => {
  try {
    const tempPolicy = await doorPolicyService.saveTempPolicy(
      req.params.scopeType,
      req.params.scopeCode,
      req.body.week_slots
    );
    res.json(tempPolicy);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/temp/:scopeType/:scopeCode', async (req, res) => {
  try {
    await doorPolicyService.cancelTempPolicy(req.params.scopeType, req.params.scopeCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/door-policies — 전체 정책 목록(직접 지정된 조직/방 + 상속 포함 전체 내무반).
// "보관함 개폐 관리/제어" 화면 상단의 현재 정책 적용 현황 뷰용.
router.get('/', async (req, res) => {
  try {
    res.json(await doorPolicyService.getPolicyGroups());
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/door-policies/temp-groups — 지금 활성인 임시정책들을 같은 카드 모양으로.
router.get('/temp-groups', async (req, res) => {
  try {
    res.json(await doorPolicyService.getActiveTempPolicyGroups());
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const policy = await doorPolicyService.createPolicy({
      name: req.body.name,
      weekSlots: req.body.week_slots,
    });
    res.status(201).json(policy);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.body.name !== undefined) {
      await doorPolicyService.renamePolicy(id, req.body.name);
    }
    if (req.body.week_slots !== undefined) {
      await doorPolicyService.updatePolicyContent(id, req.body.week_slots);
    }
    res.json(await doorPolicyService.getPolicyGroups());
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await doorPolicyService.deletePolicy(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    await doorPolicyService.addMember(Number(req.params.id), req.body.scope_type, req.body.scope_code);
    res.status(201).json(await doorPolicyService.getPolicyGroups());
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/members/:scopeType/:scopeCode', async (req, res) => {
  try {
    await doorPolicyService.removeMember(req.params.scopeType, req.params.scopeCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
