const doorScheduleTemplateRepository = require('../repositories/doorScheduleTemplateRepository');
const { assertValidWeekSlots } = require('./doorScheduleUtil');

const TEMPLATE_CODE_MAX = 30;
const TEMPLATE_NAME_MAX = 100;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertTemplateCode(templateCode) {
  if (typeof templateCode !== 'string' || templateCode.trim() === '') {
    throw new ServiceError('template_code는 필수입니다.', 400);
  }
  if (templateCode.length > TEMPLATE_CODE_MAX) {
    throw new ServiceError(`template_code는 ${TEMPLATE_CODE_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertTemplateName(templateName) {
  if (typeof templateName !== 'string' || templateName.trim() === '') {
    throw new ServiceError('template_name은 필수입니다.', 400);
  }
  if (templateName.length > TEMPLATE_NAME_MAX) {
    throw new ServiceError(`template_name은 ${TEMPLATE_NAME_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertWeekSlots(weekSlots) {
  try {
    assertValidWeekSlots(weekSlots);
  } catch (err) {
    throw new ServiceError(err.message, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 template_code입니다.', 409);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('이 템플릿을 참조하는 정책이 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listTemplates() {
  return doorScheduleTemplateRepository.findAll();
}

async function getTemplate(templateCode) {
  const template = await doorScheduleTemplateRepository.findById(templateCode);
  if (!template) {
    throw new ServiceError('템플릿을 찾을 수 없습니다.', 404);
  }
  return template;
}

async function createTemplate(data) {
  assertTemplateCode(data.templateCode);
  assertTemplateName(data.templateName);
  assertWeekSlots(data.weekSlots);

  try {
    return await doorScheduleTemplateRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateTemplate(templateCode, data) {
  assertTemplateCode(templateCode);
  if (data.templateName !== undefined) assertTemplateName(data.templateName);
  if (data.weekSlots !== undefined) assertWeekSlots(data.weekSlots);

  await getTemplate(templateCode);

  try {
    return await doorScheduleTemplateRepository.update(templateCode, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteTemplate(templateCode) {
  await getTemplate(templateCode);
  try {
    await doorScheduleTemplateRepository.remove(templateCode);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
