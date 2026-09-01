const STATUS_TYPE_LABELS = {
  absent: '부재',
  anomaly: '이상',
  unregistered_uid: '미등록',
  wrong_room: '타내무반',
  admin_action: '관리자 조작',
};

const SCOPE_TYPE_LABELS = { base: '중대', building: '소대', room: '내무반', global: '전체' };

// 관리자 조작 이벤트(즉각 전환/정책 변경)는 service_number/rfid_uid가 없으므로
// detail JSON에서 "대상"에 해당하는 값을 뽑아 보여준다.
function describeAdminActionTarget(detail) {
  if (!detail) return '-';
  switch (detail.event_type) {
    case 'door_override_start':
    case 'door_override_cancel':
      return detail.applicant || '-';
    case 'scope_assign':
    case 'scope_unassign':
    case 'temp_policy_save':
    case 'temp_policy_cancel': {
      const label = SCOPE_TYPE_LABELS[detail.scope_type] || detail.scope_type;
      return detail.scope_code ? `${label} ${detail.scope_code}` : '-';
    }
    default:
      return '-';
  }
}

function statusEventTarget(item) {
  if (item.status_type === 'admin_action') return describeAdminActionTarget(item.detail);
  return item.service_number || item.rfid_uid || '-';
}

export { STATUS_TYPE_LABELS, describeAdminActionTarget, statusEventTarget };
