const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", (req, res) => {
  res.render("thongke");
});

router.get("/data", async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? `${startDate} 00:00:00`
    : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  const end = endDate ? `${endDate} 23:59:59` : new Date().toISOString();

  const client = await pool.connect();
  try {

    const queryRevenue = `
            SELECT TO_CHAR(tt_thoi_gian_lap, 'DD/MM/YYYY') as ngay, SUM(tt_tong_tien) as doanh_thu
            FROM thanh_toan
            WHERE tt_da_thanh_toan = true 
            AND tt_thoi_gian_lap >= $1 AND tt_thoi_gian_lap <= $2
            GROUP BY TO_CHAR(tt_thoi_gian_lap, 'DD/MM/YYYY'), DATE(tt_thoi_gian_lap)
            ORDER BY DATE(tt_thoi_gian_lap) ASC
        `;
    const resRevenue = await client.query(queryRevenue, [start, end]);

    const queryPatients = `
            SELECT COUNT(*) as so_luong
            FROM phieu_kham_benh
            WHERE pkb_ngay_kham >= $1 AND pkb_ngay_kham <= $2
        `;
    const resPatients = await client.query(queryPatients, [start, end]);
    const queryDiseases = `
            SELECT b.b_ten, COUNT(cd.cd_ma_benh) as so_luong
            FROM chan_doan cd
            JOIN benh b ON cd.cd_ma_benh = b.b_ma
            JOIN don_thuoc dt ON cd.cd_ma_dt = dt.dt_ma
            WHERE dt.dt_ngay_tao >= $1 AND dt.dt_ngay_tao <= $2
            GROUP BY b.b_ten
            ORDER BY so_luong DESC
            LIMIT 5
        `;
    const resDiseases = await client.query(queryDiseases, [start, end]);
    const queryMeds = `
            SELECT t.t_ten_thuoc, SUM(ctdt.ctdt_so_luong) as tong_so
            FROM chi_tiet_don_thuoc ctdt
            JOIN thuoc t ON ctdt.ctdt_ma_thuoc = t.t_ma
            JOIN don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
            WHERE dt.dt_ngay_tao >= $1 AND dt.dt_ngay_tao <= $2
            GROUP BY t.t_ten_thuoc
            ORDER BY tong_so DESC
            LIMIT 5
        `;
    const resMeds = await client.query(queryMeds, [start, end]);

    const totalRevenue = resRevenue.rows.reduce(
      (sum, item) => sum + parseFloat(item.doanh_thu),
      0
    );

    res.json({
      revenueChart: resRevenue.rows,
      totalPatients: resPatients.rows[0].so_luong,
      topDiseases: resDiseases.rows,
      topMeds: resMeds.rows,
      totalRevenue: totalRevenue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi Server" });
  } finally {
    client.release();
  }
});

module.exports = router;
