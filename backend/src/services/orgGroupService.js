const orgGroupRepository = require('../repositories/orgGroupRepository');

const ORG_CODE_MAX = 30;
const ORG_NAME_MAX = 100;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertOrgCode(orgCode) {
  if (typeof orgCode !== 'string' || orgCode.trim() === '') {
    throw new ServiceError('org_code는 필수입니다.', 400);
  }
  if (orgCode.length > ORG_CODE_MAX) {
    throw new ServiceError(`org_code는 ${ORG_CODE_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertOrgName(orgName) {
  if (typeof orgName !== 'string' || orgName.trim() === '') {
    throw new ServiceError('org_name은 필수입니다.', 400);
  }
  if (orgName.length > ORG_NAME_MAX) {
    throw new ServiceError(`org_name은 ${ORG_NAME_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 org_code입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 상위 조직 코드입니다.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('하위 조직이 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listOrgGroups() {
  return orgGroupRepository.findAll();
}

async function getOrgGroup(orgCode) {
  const orgGroup = await orgGroupRepository.findById(orgCode);
  if (!orgGroup) {
    throw new ServiceError('조직을 찾을 수 없습니다.', 404);
  }
  return orgGroup;
}

async function createOrgGroup(data) {
  assertOrgCode(data.orgCode);
  assertOrgName(data.orgName);

  try {
    return await orgGroupRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateOrgGroup(orgCode, data) {
  assertOrgCode(orgCode);
  if (data.orgName !== undefined) assertOrgName(data.orgName);

  await getOrgGroup(orgCode);

  try {
    return await orgGroupRepository.update(orgCode, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteOrgGroup(orgCode) {
  await getOrgGroup(orgCode);
  try {
    await orgGroupRepository.remove(orgCode);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listOrgGroups,
  getOrgGroup,
  createOrgGroup,
  updateOrgGroup,
  deleteOrgGroup,
};
