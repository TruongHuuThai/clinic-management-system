const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/all", async (req, res) => {
  try {
    const truyVan = `
    SELECT 
        dv.dvcls_ma, 
        dv.dvcls_ten, 
        cgdv.cgdv_gia_ddich_vu 
    FROM 
        dich_vu_can_lam_san dv
    LEFT JOIN 
        co_gia_dich_vu cgdv 
    ON 
        dv.dvcls_ma = cgdv.cgdv_dvcls_ma
    WHERE 
        cgdv.cgdv_ngay_ap_dung = (
            SELECT MAX(cg.cgdv_ngay_ap_dung)
            FROM co_gia_dich_vu cg
            WHERE cg.cgdv_dvcls_ma = dv.dvcls_ma 
              AND cg.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
        )
        OR cgdv.cgdv_dvcls_ma IS NULL
    ORDER BY dv.dvcls_ten;  
    `;
    const ketQua = await pool.query(truyVan);

    res.json(ketQua.rows);
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ error: "Loi tai dich vu" });
  }
});

router.get("/", async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    if (page < 1) page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const queryData = `
        SELECT * FROM dich_vu_can_lam_san
        WHERE dvcls_da_xoa = false 
        ORDER BY dvcls_ma DESC 
        LIMIT $1 OFFSET $2
    `;
    const queryCount = `SELECT COUNT(*) FROM dich_vu_can_lam_san WHERE dvcls_da_xoa = false`;
    const queryNhom = `
        SELECT DISTINCT dvcls_loai 
        FROM dich_vu_can_lam_san
        WHERE dvcls_da_xoa = false AND dvcls_loai IS NOT NULL 
        ORDER BY dvcls_loai ASC
    `;
    const [resultData, resultCount, resultNhom] = await Promise.all([
      pool.query(queryData, [limit, offset]),
      pool.query(queryCount),
      pool.query(queryNhom),
    ]);

    const totalItems = parseInt(resultCount.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.render("cls_danhsach", {
      danhSachDV: resultData.rows,
      danhSachNhom: resultNhom.rows,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
    });
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).send("Lỗi Server");
  }
});

router.get("/tim-kiem", async (req, res) => {
  const tuKhoa = req.query.q;
  if (!tuKhoa) return res.json([]);
  try {
    const query = `
            SELECT dvcls_ma, dvcls_ten, dvcls_loai
            FROM dich_vu_can_lam_san
            WHERE dvcls_ten ILIKE $1 AND dvcls_da_xoa = false 
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
  const { dvcls_ten, dvcls_loai, dvcls_phuong_pham, dvcls_ghi_chu } = req.body;
  try {
    await pool.query(
      "INSERT INTO dich_vu_can_lam_san(dvcls_ten, dvcls_loai, dvcls_phuong_pham, dvcls_ghi_chu, dvcls_da_xoa) VALUES ($1, $2, $3, $4, false)",
      [dvcls_ten, dvcls_loai, dvcls_phuong_pham, dvcls_ghi_chu]
    );
    res.json({ success: true, message: "Thêm dịch vụ thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/sua", async (req, res) => {
  const { dvcls_ma, dvcls_ten, dvcls_loai, dvcls_phuong_pham, dvcls_ghi_chu } =
    req.body;
  try {
    await pool.query(
      "UPDATE dich_vu_can_lam_san SET dvcls_ten=$1, dvcls_loai=$2, dvcls_phuong_pham=$3, dvcls_ghi_chu=$4 WHERE dvcls_ma=$5",
      [dvcls_ten, dvcls_loai, dvcls_phuong_pham, dvcls_ghi_chu, dvcls_ma]
    );
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/xoa/:id", async (req, res) => {
  const dvcls_ma = req.params.id;
  try {
    await pool.query(
      "UPDATE dich_vu_can_lam_san SET dvcls_da_xoa = true WHERE dvcls_ma = $1",
      [dvcls_ma]
    );
    res.json({ success: true, message: "Đã xóa dịch vụ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
