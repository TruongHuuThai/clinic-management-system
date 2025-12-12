const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/new/:id", async (req, res) => {
  const idParam = req.params.id;
  let maBenhNhan = null;
  let maLichHen = null;
  try {
    let isLichHen = false;
    try {
      const checkLH = await pool.query(
        "SELECT * FROM lich_hen WHERE lh_ma = $1",
        [idParam]
      );
      if (checkLH.rows.length > 0) {
        maLichHen = idParam;
        maBenhNhan = checkLH.rows[0].lh_ma_bn;
        isLichHen = true;
      }
    } catch (e) {}
    if (!isLichHen) maBenhNhan = idParam;

    const resultBN = await pool.query(
      "SELECT * FROM benh_nhan WHERE bn_ma = $1",
      [maBenhNhan]
    );
    if (resultBN.rows.length === 0)
      return res
        .status(404)
        .render("loi_hethong", { message: "Không tìm thấy bệnh nhân" });

    const resultThuoc = await pool.query(
      "SELECT * FROM thuoc ORDER BY t_ten_thuoc"
    );
    const resultBenh = await pool.query(
      "SELECT * FROM benh WHERE b_da_xoa = false ORDER BY b_ten"
    );

    res.render("phieukham_them", {
      benhNhan: resultBN.rows[0],
      danhSachThuoc: resultThuoc.rows,
      danhSachBenh: resultBenh.rows,
      lh_ma: maLichHen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
});

router.post("/save", async (req, res) => {
  const toArray = (val) => (val ? (Array.isArray(val) ? val : [val]) : []);

  const {
    pkb_ma_bn,
    lh_ma,
    pkb_trieu_chung,
    pkb_ghi_chu,
    pkb_loi_dan,
    pkb_chi_dinh_ngoai,
    dt_ghi_chu,
    pkb_ngay_tai_kham,
  } = req.body;

  const ds_thuoc_ma = toArray(req.body.thuoc_ma);
  const ds_so_luong = toArray(req.body.so_luong);
  const ds_lieu_dung = toArray(req.body.lieu_dung);
  const ds_cach_dung = toArray(req.body.cach_dung);
  const ma_benh = toArray(req.body.ma_benh);
  const ds_dich_vu = toArray(req.body.dich_vu_chi_dinh);

  if (!pkb_ma_bn) return res.status(400).send("Thiếu mã bệnh nhân.");

  const client = await pool.connect();
  let pcd_ma = null;

  try {
    await client.query("BEGIN");

    let ngayTaiKham =
      pkb_ngay_tai_kham && pkb_ngay_tai_kham !== "" ? pkb_ngay_tai_kham : null;

    const insertPKB = `
            INSERT INTO phieu_kham_benh 
            (pkb_ma_bn, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu, pkb_loi_dan, pkb_chi_dinh_ngoai, pkb_ngay_tai_kham)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6)
            RETURNING pkb_ma;
        `;
    const resPKB = await client.query(insertPKB, [
      pkb_ma_bn,
      pkb_trieu_chung,
      pkb_ghi_chu || "",
      pkb_loi_dan || "",
      pkb_chi_dinh_ngoai || "",
      ngayTaiKham,
    ]);

    if (resPKB.rows.length === 0)
      throw new Error("Không lấy được ID phiếu khám mới.");
    const pkb_ma = resPKB.rows[0].pkb_ma;

    if (ds_dich_vu.length > 0) {
      const insertPCD = `INSERT INTO phieu_chi_dinh (pcd_ma_pkb) VALUES ($1) RETURNING pcd_ma`;
      const resPCD = await client.query(insertPCD, [pkb_ma]);
      pcd_ma = resPCD.rows[0].pcd_ma;

      const insertCTCD = `INSERT INTO chi_tiet_chi_dinh (ctcd_ma_pcd, ctcd_ma_dvcls) VALUES ($1, $2)`;
      for (const maDV of ds_dich_vu) {
        if (maDV) {
          await client.query(insertCTCD, [pcd_ma, maDV]);
        }
      }
    }

    const insertDT = `INSERT INTO don_thuoc (dt_ma_pkb, dt_ngay_tao, dt_ghi_chu) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING dt_ma`;
    const resDT = await client.query(insertDT, [pkb_ma, dt_ghi_chu || ""]);
    const dt_ma = resDT.rows[0].dt_ma;

    if (ds_thuoc_ma.length > 0) {
      const insertCTDT = `
                INSERT INTO chi_tiet_don_thuoc 
                (ctdt_ma_dt, ctdt_ma_thuoc, ctdt_so_luong, ctdt_lieu_dung, ctdt_cach_dung) 
                VALUES ($1, $2, $3, $4, $5)
            `;

      for (let i = 0; i < ds_thuoc_ma.length; i++) {
        const sl = parseInt(ds_so_luong[i]);

        if (ds_thuoc_ma[i] && !isNaN(sl) && sl > 0) {
          await client.query(insertCTDT, [
            dt_ma,
            ds_thuoc_ma[i],
            sl,
            ds_lieu_dung[i] || "",
            ds_cach_dung[i] || "",
          ]);
        }
      }
    }

    if (ma_benh.length > 0) {
      const insertCD = `INSERT INTO chan_doan (cd_ma_dt, cd_ma_benh) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
      for (const idBenh of ma_benh) {
        if (idBenh) await client.query(insertCD, [dt_ma, idBenh]);
      }
    }

    if (lh_ma) {
      await client.query(
        `UPDATE lich_hen SET lh_trang_thai = 'CHO_THANH_TOAN' WHERE lh_ma = $1`,
        [lh_ma]
      );
    }

    await client.query("COMMIT");

    if (pcd_ma) {
      return res.redirect(`/api/ket-qua-cls/nhap/${pcd_ma}`);
    } else {
      return res.redirect(`/api/thanh-toan/lap-phieu/${pkb_ma}`);
    }
  } catch (loi) {
    await client.query("ROLLBACK");
    console.error(loi);
    res.status(500).send("Lỗi lưu phiếu: " + loi.message);
  } finally {
    client.release();
  }
});

module.exports = router;
