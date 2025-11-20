const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/new/:lh_ma", async (req, res) => {
  const lh_ma = req.params.lh_ma;

  try {
    const lichHenQuery = `
            SELECT lh_ma_bn, lh_ngay_hen 
            FROM lich_hen 
            WHERE lh_ma = $1;
        `;
    const lichHenRes = await pool.query(lichHenQuery, [lh_ma]);

    if (!lichHenRes || lichHenRes.rows.length === 0) {
      return res
        .status(404)
        .render("error_page", { message: "Không tìm thấy Lịch Hẹn này." });
    }

    const bn_ma = lichHenRes.rows[0].lh_ma_bn;
    const ngayKham = lichHenRes.rows[0].lh_ngay_hen;

    const benhNhanQuery = `
            SELECT bn_ma, bn_ho_ten, bn_gioi_tinh, bn_ngay_sinh, bn_sdt, bn_dia_chi
            FROM benh_nhan 
            WHERE bn_ma = $1;
        `;
    const benhNhanRes = await pool.query(benhNhanQuery, [bn_ma]);

    const benhNhanData = benhNhanRes.rows.length > 0 ? benhNhanRes.rows[0] : {};

    benhNhanData.ngayKham = ngayKham;

    return res.render("phieukhambenh_form", {
      benhNhan: benhNhanData,
      lh_ma: lh_ma,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin khám bệnh:", error);
    return res.status(500).render("error_page", {
      message: "Lỗi hệ thống khi tải phiếu khám (Lỗi truy vấn).",
    });
  }
});

router.post("/save", async (req, res) => {
  const {
    pkb_ma_bn,
    lh_ma,
    pkb_trieu_chung,
    pkb_ghi_chu,
    dt_ghi_chu,
    thuoc_ma,
    so_luong,
    cach_dung,
    ma_benh,
    service_ma,
    service_so_luong,
  } = req.body;

  let pcd_ma_created = null; 

  if (!pkb_ma_bn || !lh_ma || !pkb_trieu_chung) {
    return res.status(400).send("Dữ liệu khám bệnh không được để trống.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pkbQuery = `
            INSERT INTO phieu_kham_benh (pkb_ma_bn, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3) 
            RETURNING pkb_ma;
        `;
    const pkbRes = await client.query(pkbQuery, [
      pkb_ma_bn,
      pkb_trieu_chung,
      pkb_ghi_chu,
    ]);
    const pkb_ma = pkbRes.rows[0].pkb_ma;

    const dtQuery = `
            INSERT INTO don_thuoc (dt_ma_pkb, dt_ngay_tao, dt_ghi_chu)
            VALUES ($1, CURRENT_TIMESTAMP, $2) 
            RETURNING dt_ma;
        `;
    const dtRes = await client.query(dtQuery, [pkb_ma, dt_ghi_chu]);
    const dt_ma = dtRes.rows[0].dt_ma;

    if (ma_benh) {
      const chanDoanQuery = `
                INSERT INTO chan_doan (cddt_ma_dt, cddt_ma_benh) 
                VALUES ($1, $2);
            `;
      await client.query(chanDoanQuery, [dt_ma, ma_benh]);
    }

    if (Array.isArray(thuoc_ma)) {
      const chiTietDtQuery = `
                INSERT INTO chi_tiet_don_thuoc (ctdt_ma_dt, ctdt_ma_thuoc, ctdt_so_luong, ctdt_cacl_dung)
                VALUES ($1, $2, $3, $4);
            `;
      for (let i = 0; i < thuoc_ma.length; i++) {
        if (thuoc_ma[i] && so_luong[i] && cach_dung[i]) {
          await client.query(chiTietDtQuery, [
            dt_ma,
            thuoc_ma[i],
            so_luong[i],
            cach_dung[i],
          ]);
        }
      }
    }

    if (Array.isArray(service_ma) && service_ma.length > 0) {
      const pcdQuery = `
                INSERT INTO phieu_chi_dinh (pcd_ma_pkb, pcd_trang_thai, pcd_ghi_chu) 
                VALUES ($1, $2, $3) 
                RETURNING pcd_ma;
            `;
      const pcdResult = await client.query(pcdQuery, [
        pkb_ma,
        "CHO_THUC_HIEN",
        req.body.pcd_ghi_chu || null,
      ]);

      pcd_ma_created = pcdResult.rows[0].pcd_ma;

      const ctcdQuery = `
                INSERT INTO chi_tiet_chi_dinh (ctcd_ma_pcd, ctcd_ma_dvcls, ctcd_so_luong, ctcd_trang_thai)
                VALUES ($1, $2, $3, $4); 
            `;

      for (let i = 0; i < service_ma.length; i++) {
        const dvcls_ma = service_ma[i];
        console.log(`dvcls_ma: ${dvcls_ma}`);

        if (dvcls_ma) {
          await client.query(ctcdQuery, [
            pcd_ma_created,
            dvcls_ma,
            service_so_luong[i] || 1,
            "DA_CHI_DINH",
          ]);
        }
      }
      console.log(`Đã tạo Phiếu Chỉ Định (PCD_MA: ${pcd_ma_created})`);
    }

    const updateLhQuery = `
            UPDATE lich_hen 
            SET lh_trang_thai = $1 
            WHERE lh_ma = $2;
        `;
    await client.query(updateLhQuery, ["DA_HOAN_THANH", lh_ma]);

    await client.query("COMMIT");

    if (pcd_ma_created) {
      res.redirect(`/api/ketquacanlamsan/nhap/${pcd_ma_created}`);
    } else {
      res.redirect(`/api/thanhtoan/lap-phieu/${pkb_ma}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("LỖI TRANSACTION KHI LƯU KHÁM BỆNH:", error);
    res.status(500).send("Lỗi máy chủ khi lưu dữ liệu khám bệnh.");
  } finally {
    client.release();
  }
});

module.exports = router;
