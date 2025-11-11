const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/nhom_thuoc", async (req, res) => {
  try {
    const query = `
            SELECT nt_ma, nt_ten 
            FROM nhom_thuoc 
            ORDER BY nt_ten;
        `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhóm thuốc:", error);
    res.status(500).json({ error: "Lỗi máy chủ khi tải nhóm thuốc." });
  }
});

router.get("/theo_nhom/:nt_ma", async (req, res) => {
  const nt_ma = req.params.nt_ma;

  try {
    const query = `
            SELECT t_ma, t_ten_thuoc, t_don_vi_tinh
            FROM thuoc 
            WHERE t_loai_thuoc = $1 
            ORDER BY t_ten_thuoc;
        `;
    const result = await pool.query(query, [nt_ma]);

    res.json(result.rows);
  } catch (error) {
    console.error("Lỗi khi lấy thuốc theo nhóm:", error);
    res.status(500).json({ error: "Lỗi máy chủ khi tải thuốc theo nhóm." });
  }
});

module.exports = router;
