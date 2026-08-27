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

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/org-groups', require('./routes/orgGroups'));
app.use('/api/bases', require('./routes/bases'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/gateways', require('./routes/gateways'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/rfid-tags', require('./routes/rfidTags'));
app.use('/api/ingest', require('./routes/ingest'));
app.use('/api/bridge', require('./routes/bridgePolicy'));
app.use('/api/door-schedule-templates', require('./routes/doorScheduleTemplates'));
app.use('/api/door-policies', require('./routes/doorPolicies'));
app.use('/api/door-overrides', require('./routes/doorOverrides'));
app.use('/api/events', require('./routes/events'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[smartvault-backend] ${process.env.NODE_ENV} 모드로 포트 ${PORT}에서 실행 중`);
});

module.exports = app;
