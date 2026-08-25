const express = require('express');
const orgGroupService = require('../services/orgGroupService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof orgGroupService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/', async (req, res) => {
  try {
    const orgGroups = await orgGroupService.listOrgGroups();
    res.json(orgGroups);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:orgCode', async (req, res) => {
  try {
    const orgGroup = await orgGroupService.getOrgGroup(req.params.orgCode);
    res.json(orgGroup);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { org_code, parent_org_code, org_name } = req.body;
    const orgGroup = await orgGroupService.createOrgGroup({
      orgCode: org_code,
      parentOrgCode: parent_org_code,
      orgName: org_name,
    });
    res.status(201).json(orgGroup);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:orgCode', async (req, res) => {
  try {
    const { org_name } = req.body;
    const orgGroup = await orgGroupService.updateOrgGroup(req.params.orgCode, { orgName: org_name });
    res.json(orgGroup);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:orgCode', async (req, res) => {
  try {
    await orgGroupService.deleteOrgGroup(req.params.orgCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
