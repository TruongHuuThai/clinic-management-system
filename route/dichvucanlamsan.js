const express = require('express');
const router = express.Router();
const pool = require('../config/db'); 

router.get("/", (req, res) => {
  res.send("Danh sách bệnh");
});

module.exports = router;