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

module.exports = router;
