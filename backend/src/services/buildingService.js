const buildingRepository = require('../repositories/buildingRepository');

const BUILDING_CODE_MAX = 20;
const BASE_CODE_MAX = 20;
const BUILDING_NAME_MAX = 100;

class ServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function assertBuildingCode(buildingCode) {
  if (typeof buildingCode !== 'string' || buildingCode.trim() === '') {
    throw new ServiceError('building_code는 필수입니다.', 400);
  }
  if (buildingCode.length > BUILDING_CODE_MAX) {
    throw new ServiceError(`building_code는 ${BUILDING_CODE_MAX}자를 초과할 수 없습니다.`, 400);
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

function assertBuildingName(buildingName) {
  if (buildingName === undefined || buildingName === null) return;
  if (typeof buildingName !== 'string' || buildingName.length > BUILDING_NAME_MAX) {
    throw new ServiceError(`building_name은 ${BUILDING_NAME_MAX}자 이하 문자열이어야 합니다.`, 400);
  }
}

function mapDbError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return new ServiceError('이미 존재하는 building_code입니다.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return new ServiceError('존재하지 않는 base_code입니다.', 400);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new ServiceError('하위 방 또는 통신 집선기가 있어 삭제할 수 없습니다.', 409);
  }
  return err;
}

async function listBuildings(baseCode) {
  return buildingRepository.findAll({ baseCode });
}

async function getBuilding(buildingCode) {
  const building = await buildingRepository.findById(buildingCode);
  if (!building) {
    throw new ServiceError('건물을 찾을 수 없습니다.', 404);
  }
  return building;
}

async function createBuilding(data) {
  assertBuildingCode(data.buildingCode);
  assertBaseCode(data.baseCode);
  assertBuildingName(data.buildingName);

  try {
    return await buildingRepository.create(data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function updateBuilding(buildingCode, data) {
  assertBuildingCode(buildingCode);
  if (data.buildingName !== undefined) assertBuildingName(data.buildingName);

  await getBuilding(buildingCode);

  try {
    return await buildingRepository.update(buildingCode, data);
  } catch (err) {
    throw mapDbError(err);
  }
}

async function deleteBuilding(buildingCode) {
  await getBuilding(buildingCode);
  try {
    await buildingRepository.remove(buildingCode);
  } catch (err) {
    throw mapDbError(err);
  }
}

module.exports = {
  ServiceError,
  listBuildings,
  getBuilding,
  createBuilding,
  updateBuilding,
  deleteBuilding,
};
