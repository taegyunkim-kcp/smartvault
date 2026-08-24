const path = require('path');
const dotenv = require('dotenv');

// NODE_ENV에 따라 .env.development 또는 .env.production을 로드한다.
// 두 파일이 동시에 존재해도 서로 섞이지 않도록 명시적으로 지정한다.
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // 운영에서는 '*' 절대 금지, 도메인/사설IP를 명시
    credentials: true,
  })
);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    port: process.env.PORT,
  });
});

app.use('/api/gateways', require('./routes/gateways'));

// TODO: 게이트웨이 브리지 인증 미들웨어 연결 (middlewares/bridgeAuth.js)

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[smartvault-backend] ${process.env.NODE_ENV} 모드로 포트 ${PORT}에서 실행 중`);
});

module.exports = app;
