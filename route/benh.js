const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    if (page < 1) page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const queryData = `
            SELECT * FROM benh 
            WHERE b_da_xoa = false 
            ORDER BY b_ma DESC 
            LIMIT $1 OFFSET $2
        `;

    const queryCount = `SELECT COUNT(*) FROM benh WHERE b_da_xoa = false`;

    const [resultData, resultCount] = await Promise.all([
      pool.query(queryData, [limit, offset]),
      pool.query(queryCount),
    ]);

    const totalItems = parseInt(resultCount.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.render("benh_danhsach", {
      danhSachBenh: resultData.rows,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách bệnh:", err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
});

router.get("/tim-kiem", async (req, res) => {
  const tuKhoa = req.query.q;
  if (!tuKhoa) return res.json([]);
  try {
    const query = `
            SELECT b_ma, b_ten, b_ma_icd 
            FROM benh 
            WHERE (b_ten ILIKE $1 OR b_ma_icd ILIKE $1) 
            AND b_da_xoa = false 
            LIMIT 10
        `;
    const result = await pool.query(query, [`%${tuKhoa}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

router.post("/them", async (req, res) => {
  const { b_ten, b_ma_icd, b_mota } = req.body;
  try {
    await pool.query(
      "INSERT INTO benh (b_ten, b_ma_icd, b_mota, b_da_xoa) VALUES ($1, $2, $3, false)",
      [b_ten, b_ma_icd, b_mota]
    );
    res.json({ success: true, message: "Thêm thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/sua", async (req, res) => {
  const { b_ma, b_ten, b_ma_icd, b_mota } = req.body;
  try {
    await pool.query(
      "UPDATE benh SET b_ten=$1, b_ma_icd=$2, b_mota=$3 WHERE b_ma=$4",
      [b_ten, b_ma_icd, b_mota, b_ma]
    );
    res.json({ success: true, message: "Sửa thành công" });
  } catch (err) {
    console.error("Lỗi Sửa Bệnh:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/xoa/:id", async (req, res) => {
  const b_ma = req.params.id;
  try {
    await pool.query("UPDATE benh SET b_da_xoa = true WHERE b_ma = $1", [b_ma]);
    res.json({ success: true, message: "Xóa thành công" });
  } catch (err) {
    console.error("Lỗi xóa bệnh:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
