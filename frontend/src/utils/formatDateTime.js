const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

// 서버는 항상 UTC로 저장/응답한다(config/db.js의 timezone: 'Z') — 화면에는 서울 기준시(KST, UTC+9)로 변환해서 표시.
function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatter.format(date);
}

export { formatDateTime };
