const express = require('express');
const baseService = require('../services/baseService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof baseService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/', async (req, res) => {
  try {
    const bases = await baseService.listBases();
    res.json(bases);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:baseCode', async (req, res) => {
  try {
    const base = await baseService.getBase(req.params.baseCode);
    res.json(base);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { base_code, base_name, parent_org_code } = req.body;
    const base = await baseService.createBase({
      baseCode: base_code,
      baseName: base_name,
      parentOrgCode: parent_org_code,
    });
    res.status(201).json(base);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:baseCode', async (req, res) => {
  try {
    const { base_name } = req.body;
    const base = await baseService.updateBase(req.params.baseCode, { baseName: base_name });
    res.json(base);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:baseCode', async (req, res) => {
  try {
    await baseService.deleteBase(req.params.baseCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
