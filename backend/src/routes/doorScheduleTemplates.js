const express = require('express');
const doorScheduleTemplateService = require('../services/doorScheduleTemplateService');

const router = express.Router();

function handleError(res, err) {
  if (err instanceof doorScheduleTemplateService.ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
}

router.get('/', async (req, res) => {
  try {
    res.json(await doorScheduleTemplateService.listTemplates());
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:templateCode', async (req, res) => {
  try {
    res.json(await doorScheduleTemplateService.getTemplate(req.params.templateCode));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const { template_code, template_name, week_slots } = req.body;
    const template = await doorScheduleTemplateService.createTemplate({
      templateCode: template_code,
      templateName: template_name,
      weekSlots: week_slots,
    });
    res.status(201).json(template);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:templateCode', async (req, res) => {
  try {
    const { template_name, week_slots } = req.body;
    const template = await doorScheduleTemplateService.updateTemplate(req.params.templateCode, {
      templateName: template_name,
      weekSlots: week_slots,
    });
    res.json(template);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:templateCode', async (req, res) => {
  try {
    await doorScheduleTemplateService.deleteTemplate(req.params.templateCode);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
