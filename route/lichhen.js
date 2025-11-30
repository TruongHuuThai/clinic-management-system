const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  const { tim_kiem, trang_thai, tu_ngay } = req.query;
  let danhSachLichHen = [];
  let tongSoLuong = 0;

  try {
    let mangDieuKien = ["lh.lh_da_xoa = FALSE"];
    let mangThamSo = [];

    if (tim_kiem) {
      mangThamSo.push(`%${tim_kiem}%`);
      mangDieuKien.push(
        `(bn.bn_ho_ten ILIKE $${mangThamSo.length} OR bn.bn_sdt ILIKE $${mangThamSo.length})`
      );
    }

    if (trang_thai) {
      mangThamSo.push(trang_thai);
      mangDieuKien.push(`lh.lh_trang_thai = $${mangThamSo.length}`);
    }

    if (tu_ngay) {
      mangThamSo.push(tu_ngay);
      mangDieuKien.push(`lh.lh_ngay_hen >= $${mangThamSo.length}`);
    }

    const chuoiDieuKien =
      mangDieuKien.length > 0 ? `WHERE ${mangDieuKien.join(" AND ")}` : "";

    const truyVanLich = `
            SELECT 
                lh.lh_ma, lh.lh_khung_gio AS gio, lh.lh_ngay_hen AS ngay, 
                bn.bn_ho_ten AS ten_benh_nhan, lh.lh_trang_thai AS trang_thai, lh.lh_ghi_chu AS ghi_chu,
                bn.bn_sdt
            FROM lich_hen lh
            WHERE lh.lh_da_xoa = false
            JOIN benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma
            ${chuoiDieuKien}
            ORDER BY lh.lh_ngay_hen DESC, lh.lh_khung_gio DESC;
        `;

    const ketQua = await pool.query(truyVanLich, mangThamSo);

    danhSachLichHen = ketQua.rows.map((dong) => ({
      ...dong,
      trang_thai_hien_thi: dong.trang_thai.replace(/_/g, " "),
    }));
    tongSoLuong = ketQua.rowCount;
  } catch (loi) {
    console.error(loi);
    return res.status(500).render("lichhen_danhsach", {
      title: "Loi",
      data: { appointments: [], totalCount: 0 },
      query: req.query || {},
    });
  }

  res.render("lichhen_danhsach", {
    title: "Quan Ly Lich Hen",
    data: {
      appointments: danhSachLichHen,
      totalCount: tongSoLuong,
    },
    query: req.query,
  });
});

router.get("/api/:maLichHen", async (req, res) => {
  try {
    const { maLichHen } = req.params;
    const truyVan = `SELECT * FROM lich_hen WHERE lh_ma = $1`;
    const ketQua = await pool.query(truyVan, [maLichHen]);

    if (ketQua.rows.length === 0) {
      return res.status(404).json({ message: "Khong tim thay lich hen" });
    }
    res.json(ketQua.rows[0]);
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi he thong" });
  }
});

router.put("/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;
  const { ngay_hen, khung_gio, trang_thai, ghi_chu } = req.body;

  if (!ngay_hen || !khung_gio || !trang_thai) {
    return res.status(400).json({ message: "Thieu thong tin bat buoc" });
  }

  try {
    const truyVanCapNhat = `
            UPDATE lich_hen 
            SET 
                lh_ngay_hen = $1, 
                lh_khung_gio = $2, 
                lh_trang_thai = $3, 
                lh_ghi_chu = $4
            WHERE 
                lh_ma = $5 and lh_da_xoa = false
            RETURNING *;
        `;
    const ketQua = await pool.query(truyVanCapNhat, [
      ngay_hen,
      khung_gio,
      trang_thai,
      ghi_chu,
      maLichHen,
    ]);

    if (ketQua.rowCount === 0) {
      return res.status(404).json({ message: "Khong tim thay lich hen" });
    }

    res.status(200).json({
      message: "Cap nhat lich hen thanh cong",
      updatedAppointment: ketQua.rows[0],
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi may chu noi bo" });
  }
});

router.post("/:maLichHen/trang-thai", async (req, res) => {
  const { maLichHen } = req.params;
  const { trang_thai_moi } = req.body;

  const TRANG_THAI_HOP_LE = [
    "DA_DEN",
    "DANG_KHAM",
    "DA_HOAN_THANH",
    "DA_HUY",
    "NO_SHOW",
  ];

  if (!trang_thai_moi || !TRANG_THAI_HOP_LE.includes(trang_thai_moi)) {
    return res.status(400).json({ message: "Trang thai khong hop le" });
  }

  try {
    const truyVanCapNhat = `UPDATE lich_hen SET lh_trang_thai = $1 WHERE lh_ma = $2;`;
    await pool.query(truyVanCapNhat, [trang_thai_moi, maLichHen]);

    res.status(200).json({
      message: "Cap nhat trang thai thanh cong",
      newStatus: trang_thai_moi,
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi may chu noi bo" });
  }
});

router.get("/khung-gio-ban/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;
  const { ngay } = req.query;

  if (!ngay) return res.status(400).json({ message: "Thieu tham so ngay" });

  try {
    const truyVan = `
            SELECT lh_khung_gio 
            FROM lich_hen 
            WHERE 
                lh_ngay_hen = $1 
                AND lh_ma != $2 
                AND lh_trang_thai NOT IN ('DA_HOAN_THANH', 'DA_HUY')
                AND lh_da_xoa = FALSE; 
        `;
    const ketQua = await pool.query(truyVan, [ngay, maLichHen]);

    const danhSachGio = ketQua.rows
      .map((dong) =>
        dong.lh_khung_gio ? String(dong.lh_khung_gio).substring(0, 5) : null
      )
      .filter((gio) => gio);

    res.status(200).json({ occupiedSlots: danhSachGio });
  } catch (loi) {
    res.status(500).json({ message: "Loi server khi lay khung gio" });
  }
});

router.delete("/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;

  try {
    const truyVanXoa = `UPDATE lich_hen SET lh_da_xoa = TRUE WHERE lh_ma = $1`;

    const ketQua = await pool.query(truyVanXoa, [maLichHen]);

    if (ketQua.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Lich hen khong ton tai hoac da bi xoa." });
    }

    res.status(200).json({ message: "Xoa thanh cong." });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi server." });
  }
});

router.get("/them-moi", async (req, res) => {
  res.render("lichhen_them", {
    title: "Them Lich Hen Moi",
    initialData: { todayDate: new Date().toISOString().substring(0, 10) },
  });
});

router.get("/tim-kiem-benh-nhan", async (req, res) => {
  const tuKhoa = req.query.q;
  if (!tuKhoa) return res.json([]);

  try {
    const truyVanTim = `
            SELECT bn_ma, bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
            FROM benh_nhan
            WHERE bn_ho_ten ILIKE $1 OR bn_sdt ILIKE $1
            LIMIT 10;
        `;
    const ketQua = await pool.query(truyVanTim, [`%${tuKhoa}%`]);
    res.json(ketQua.rows);
  } catch (loi) {
    res.status(500).json([]);
  }
});

router.post("/them-moi", async (req, res) => {
  const {
    ngay_hen,
    khung_gio,
    trang_thai,
    ghi_chu,
    bn_ma,
    bn_ho_ten,
    bn_sdt,
    bn_gioi_tinh,
    bn_ngay_sinh,
    bn_dia_chi,
  } = req.body;

  let maBenhNhanDung;
  let ketNoi;

  if (!ngay_hen || !khung_gio) {
    return res.status(400).json({ message: "Thieu Ngay hoac Khung gio" });
  }

  try {
    ketNoi = await pool.connect();
    await ketNoi.query("BEGIN");

    if (!bn_ma) {
      if (!bn_ho_ten || !bn_sdt || !bn_ngay_sinh) {
        await ketNoi.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Thieu thong tin benh nhan moi" });
      }

      const truyVanThemBenhNhan = `
                INSERT INTO benh_nhan (bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING bn_ma;
            `;
      const ketQuaBenhNhan = await ketNoi.query(truyVanThemBenhNhan, [
        bn_ho_ten,
        bn_sdt,
        bn_gioi_tinh,
        bn_ngay_sinh,
        bn_dia_chi,
      ]);
      maBenhNhanDung = ketQuaBenhNhan.rows[0].bn_ma;
    } else {
      maBenhNhanDung = bn_ma;
    }

    const truyVanThemLich = `
            INSERT INTO lich_hen (lh_ma_bn, lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
    const ketQuaLich = await ketNoi.query(truyVanThemLich, [
      maBenhNhanDung,
      ngay_hen,
      khung_gio,
      trang_thai || "TAI_KHAM",
      ghi_chu,
    ]);

    await ketNoi.query("COMMIT");

    res.status(201).json({
      message: "Tao lich hen thanh cong",
      appointment: ketQuaLich.rows[0],
    });
  } catch (loi) {
    if (ketNoi) await ketNoi.query("ROLLBACK");
    res.status(500).json({ message: "Loi server khi tao lich hen" });
  } finally {
    if (ketNoi) ketNoi.release();
  }
});

router.post("/dat-lich-tai-kham", async (req, res) => {
  const { maBenhNhan, ngay_hen, khung_gio, trang_thai, ghi_chu } = req.body;

  if (!maBenhNhan || !ngay_hen || !khung_gio) {
    return res.status(400).json({ message: "Thieu thong tin bat buoc" });
  }

  let ketNoi;
  try {
    ketNoi = await pool.connect();
    await ketNoi.query("BEGIN");

    const truyVanTrungLich = `
            SELECT lh_ma FROM lich_hen 
            WHERE lh_ngay_hen = $1 AND lh_khung_gio = $2 
            AND lh_trang_thai NOT IN ('DA_HUY', 'DA_KHAM') AND lh_da_xoa = FALSE;
        `;
    const ketQuaTrung = await ketNoi.query(truyVanTrungLich, [
      ngay_hen,
      khung_gio,
    ]);

    if (ketQuaTrung.rowCount > 0) {
      await ketNoi.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Khung gio nay da co lich hen khac" });
    }

    const truyVanThem = `
            INSERT INTO lich_hen (lh_ma_bn, lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING lh_ma; 
        `;
    const ketQua = await ketNoi.query(truyVanThem, [
      maBenhNhan,
      ngay_hen,
      khung_gio,
      trang_thai || "CHO_KHAM",
      ghi_chu,
    ]);

    await ketNoi.query("COMMIT");
    res.status(201).json({
      message: "Tao lich hen thanh cong",
      appointmentId: ketQua.rows[0].lh_ma,
    });
  } catch (loi) {
    if (ketNoi) await ketNoi.query("ROLLBACK");
    res.status(500).json({ message: "Loi server khi luu lich hen" });
  } finally {
    if (ketNoi) ketNoi.release();
  }
});

router.post("/tiep-don-ngay", async (req, res) => {
  const { maBenhNhan, ghiChu } = req.body;

  if (!maBenhNhan) {
    return res.status(400).json({ message: "Thieu ma benh nhan" });
  }

  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");

    const ngayHienTai = new Date();
    const gioHienTai = ngayHienTai.toTimeString().substring(0, 5);

    const truyVanThem = `
        INSERT INTO lich_hen (
            lh_ma_bn, 
            lh_ngay_hen, 
            lh_khung_gio, 
            lh_trang_thai, 
            lh_ghi_chu
        )
        VALUES ($1, CURRENT_DATE, $2, 'DANG_KHAM', $3)
        RETURNING lh_ma;
    `;

    const ketQua = await ketNoi.query(truyVanThem, [
      maBenhNhan,
      gioHienTai,
      ghiChu || "Bệnh nhân đến trực tiếp (Vãng lai)",
    ]);

    await ketNoi.query("COMMIT");

    res.json({
      success: true,
      maLichHen: ketQua.rows[0].lh_ma,
      message: "Da tao ho so tiep don",
    });
    
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).json({ message: "Loi he thong khi tiep don" });
  } finally {
    ketNoi.release();
  }
});

module.exports = router;
