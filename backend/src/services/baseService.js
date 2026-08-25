const baseRepository = require('../repositories/baseRepository');

const BASE_CODE_MAX = 20;
const BASE_NAME_MAX = 100;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertBaseCode(baseCode) {
  if (typeof baseCode !== 'string' || baseCode.trim() === '') {
    throw new ServiceError('base_code는 필수입니다.', 400);
  }
  if (baseCode.length > BASE_CODE_MAX) {
    throw new ServiceError(`base_code는 ${BASE_CODE_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function assertBaseName(baseName) {
  if (typeof baseName !== 'string' || baseName.trim() === '') {
    throw new ServiceError('base_name은 필수입니다.', 400);
  }
  if (baseName.length > BASE_NAME_MAX) {
    throw new ServiceError(`base_name은 ${BASE_NAME_MAX}자를 초과할 수 없습니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 base_code입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 상위 조직 코드입니다.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('하위 건물이 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listBases() {
  return baseRepository.findAll();
}

async function getBase(baseCode) {
  const base = await baseRepository.findById(baseCode);
  if (!base) {
    throw new ServiceError('기지를 찾을 수 없습니다.', 404);
  }
  return base;
}

async function createBase(data) {
  assertBaseCode(data.baseCode);
  assertBaseName(data.baseName);

  try {
    return await baseRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateBase(baseCode, data) {
  assertBaseCode(baseCode);
  if (data.baseName !== undefined) assertBaseName(data.baseName);

  await getBase(baseCode);

  try {
    return await baseRepository.update(baseCode, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteBase(baseCode) {
  await getBase(baseCode);
  try {
    await baseRepository.remove(baseCode);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listBases,
  getBase,
  createBase,
  updateBase,
  deleteBase,
};
