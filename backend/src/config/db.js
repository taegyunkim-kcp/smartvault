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
});

// 사용 예시 (repositories 레이어에서만 SQL을 작성한다):
//   const [rows] = await pool.execute(
//     'SELECT * FROM users WHERE id_sequence = :id',
//     { id: idSequence }
//   );
// 문자열 concat으로 쿼리를 조립하는 코드는 리뷰에서 반려한다 (SQL Injection).

module.exports = pool;
