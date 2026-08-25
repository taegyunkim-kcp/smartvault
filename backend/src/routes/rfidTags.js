const express = require('express');
const rfidTagRepository = require('../repositories/rfidTagRepository');

const router = express.Router();

router.get('/unmatched', async (req, res) => {
  try {
    res.json(await rfidTagRepository.findUnmatchedTags());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
