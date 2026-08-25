const mysql = require('mysql2/promise');

// 자격증명은 항상 .env.* 에서만 읽는다. 코드에 절대 하드코딩하지 않는다.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  namedPlaceholders: true,
  // DB 서버(컨테이너)는 항상 UTC로 뜬다. 이 옵션이 없으면 mysql2가 JS Date를
  // Node 프로세스의 로컬 타임존(개발 PC는 KST)으로 포맷해서 써버려, DB의 UTC
  // 시계와 어긋난 값이 저장된다 — occurred_at 비교/스케줄 판정이 조용히 틀어짐.
  timezone: 'Z',
});

// 사용 예시 (repositories 레이어에서만 SQL을 작성한다):
//   const [rows] = await pool.execute(
//     'SELECT * FROM users WHERE id_sequence = :id',
//     { id: idSequence }
//   );
// 문자열 concat으로 쿼리를 조립하는 코드는 리뷰에서 반려한다 (SQL Injection).

module.exports = pool;
