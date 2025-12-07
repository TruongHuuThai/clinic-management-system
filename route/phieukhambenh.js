const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/new/:maLichHen", async (req, res) => {
  const maLichHen = req.params.maLichHen;

  try {
    const truyVanLichHen = `
            SELECT lh_ma_bn, lh_ngay_hen, lh_khung_gio
            FROM lich_hen 
            WHERE lh_ma = $1;
        `;
    const ketQuaLichHen = await pool.query(truyVanLichHen, [maLichHen]);

    if (!ketQuaLichHen || ketQuaLichHen.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay lich hen" });
    }

    const maBenhNhan = ketQuaLichHen.rows[0].lh_ma_bn;
    const ngayHen = ketQuaLichHen.rows[0].lh_ngay_hen;
    const khungGio = ketQuaLichHen.rows[0].lh_khung_gio;

    const truyVanBenhNhan = `
            SELECT bn_ma, bn_ho_ten, bn_gioi_tinh, bn_ngay_sinh, bn_sdt, bn_dia_chi
            FROM benh_nhan 
            WHERE bn_ma = $1;
        `;
    const ketQuaBenhNhan = await pool.query(truyVanBenhNhan, [maBenhNhan]);

    const duLieuBenhNhan =
      ketQuaBenhNhan.rows.length > 0 ? ketQuaBenhNhan.rows[0] : {};

    duLieuBenhNhan.lh_ngay_hen = ngayHen;
    duLieuBenhNhan.lh_khung_gio = khungGio;

    return res.render("phieukham_them", {
      benhNhan: duLieuBenhNhan,
      lh_ma: maLichHen,
    });
  } catch (loi) {
    console.error("Loi khi lay thong tin kham benh:", loi);
    return res.status(500).render("loi_hethong", {
      message: "Loi he thong khi tai phieu kham.",
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
    pcd_ghi_chu,
  } = req.body;

  const toArray = (val) => (val ? (Array.isArray(val) ? val : [val]) : []);
  const ma_benh = toArray(req.body.ma_benh);
  const thuoc_ma = toArray(req.body.thuoc_ma);
  const so_luong = toArray(req.body.so_luong);
  const lieu_dung = toArray(req.body.lieu_dung);
  const cach_dung = toArray(req.body.cach_dung);
  const service_ma = toArray(req.body.service_ma);
  const service_so_luong = toArray(req.body.service_so_luong);

  let maPhieuChiDinhMoi = null;
  let maPhieuKham = null;

  if (!pkb_ma_bn || !lh_ma || !pkb_trieu_chung) {
    return res.status(400).send("Dữ liệu khám bệnh thiếu.");
  }
  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");
    const truyVanPkb = `
            INSERT INTO phieu_kham_benh (pkb_ma_bn, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3) 
            RETURNING pkb_ma;
        `;
    const ketQuaPkb = await ketNoi.query(truyVanPkb, [
      pkb_ma_bn,
      pkb_trieu_chung,
      pkb_ghi_chu,
    ]);
    maPhieuKham = ketQuaPkb.rows[0].pkb_ma;
    const coThuoc = thuoc_ma.length > 0 && thuoc_ma[0] !== "";
    const coBenh = ma_benh.length > 0;

    if (coThuoc || coBenh) {
      const truyVanDonThuoc = `
                INSERT INTO don_thuoc (dt_ma_pkb, dt_ngay_tao, dt_ghi_chu)
                VALUES ($1, CURRENT_TIMESTAMP, $2) 
                RETURNING dt_ma;
            `;
      const ketQuaDonThuoc = await ketNoi.query(truyVanDonThuoc, [
        maPhieuKham,
        dt_ghi_chu,
      ]);
      const maDonThuoc = ketQuaDonThuoc.rows[0].dt_ma;
      if (coBenh) {
        const truyVanChanDoan = `
              INSERT INTO CHAN_DOAN (cd_ma_dt, cd_ma_benh) 
              VALUES ($1, $2)
              ON CONFLICT (cd_ma_dt, cd_ma_benh) DO NOTHING;
          `;
        for (const idBenh of ma_benh) {
          await ketNoi.query(truyVanChanDoan, [maDonThuoc, idBenh]);
        }
      }
      if (coThuoc) {
        const truyVanChiTietDt = `
              INSERT INTO chi_tiet_don_thuoc (ctdt_ma_dt, ctdt_ma_thuoc, ctdt_so_luong, ctdt_lieu_dung, ctdt_cach_dung)
              VALUES ($1, $2, $3, $4, $5);
          `;

        for (let i = 0; i < thuoc_ma.length; i++) {
          if (thuoc_ma[i] && so_luong[i]) {
            await ketNoi.query(truyVanChiTietDt, [
              maDonThuoc,
              thuoc_ma[i],
              so_luong[i],
              lieu_dung[i] || "",
              cach_dung[i] || "",
            ]);
          }
        }
      }
    }
    if (service_ma.length > 0 && service_ma[0] !== "") {
      const truyVanPcd = `
                INSERT INTO phieu_chi_dinh (pcd_ma_pkb, pcd_trang_thai, pcd_ghi_chu) 
                VALUES ($1, $2, $3) 
                RETURNING pcd_ma;
            `;
      const ketQuaPcd = await ketNoi.query(truyVanPcd, [
        maPhieuKham,
        "CHO_THUC_HIEN",
        pcd_ghi_chu || null,
      ]);
      maPhieuChiDinhMoi = ketQuaPcd.rows[0].pcd_ma;

      const truyVanCtcd = `
                INSERT INTO chi_tiet_chi_dinh (ctcd_ma_pcd, ctcd_ma_dvcls, ctcd_so_luong, ctcd_trang_thai)
                VALUES ($1, $2, $3, $4); 
            `;

      for (let i = 0; i < service_ma.length; i++) {
        if (service_ma[i]) {
          await ketNoi.query(truyVanCtcd, [
            maPhieuChiDinhMoi,
            service_ma[i],
            service_so_luong[i] || 1,
            "DA_CHI_DINH",
          ]);
        }
      }
    }
    if (lh_ma) {
      const truyVanCapNhatLich = `UPDATE lich_hen SET lh_trang_thai = 'DA_HOAN_THANH' WHERE lh_ma = $1;`;
      await ketNoi.query(truyVanCapNhatLich, [lh_ma]);
    }

    await ketNoi.query("COMMIT");

    if (maPhieuChiDinhMoi) {
      res.redirect(`/api/ket-qua-cls/nhap/${maPhieuChiDinhMoi}`);
    } else {
      res.redirect(
        `/api/thanh-toan/lap-phieu/${maPhieuChiDinhMoi || maPhieuKham}`
      );
    }
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error("LOI LUU PHIEU KHAM:", loi);
    res.status(500).send("Lỗi máy chủ khi lưu phiếu khám: " + loi.message);
  } finally {
    ketNoi.release();
  }
});

module.exports = router;
