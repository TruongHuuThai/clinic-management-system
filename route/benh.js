const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/tim-kiem", async (req, res) => {
  const tuKhoa = req.query.q;
  if (!tuKhoa) return res.json([]);

  try {
    const truyVan = `
        SELECT b_ma, b_ten, b_mota, b_ma_icd
        FROM benh 
        WHERE b_ten ILIKE $1 
        LIMIT 10;
    `;
    const ketQua = await pool.query(truyVan, [`%${tuKhoa}%`]);
    res.json(ketQua.rows);
  } catch (loi) {
    console.error(loi);
    res.json([]);
  }
});

module.exports = router;
