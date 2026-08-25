const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토' };

function emptyWeekSlots() {
  const week = {};
  for (const day of DAY_KEYS) {
    week[day] = new Array(48).fill(false);
  }
  return week;
}

export { DAY_KEYS, DAY_LABELS, emptyWeekSlots };
