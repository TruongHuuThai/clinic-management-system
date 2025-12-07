const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  const { tim_kiem, trang_thai, tu_ngay, trang } = req.query;

  const SO_DONG_MOI_TRANG = 10;
  const trangHienTai = parseInt(trang) || 1; 
  const viTriBatDau = (trangHienTai - 1) * SO_DONG_MOI_TRANG;

  let danhSachLichHen = [];
  let tongSoLuong = 0;
  let tongSoTrang = 0;

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

    const chuoiDieuKien = `WHERE ${mangDieuKien.join(" AND ")}`;

    const truyVanDem = `
        SELECT COUNT(*) 
        FROM lich_hen lh
        JOIN benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma
        ${chuoiDieuKien}
    `;
    const ketQuaDem = await pool.query(truyVanDem, mangThamSo);
    tongSoLuong = parseInt(ketQuaDem.rows[0].count);
    tongSoTrang = Math.ceil(tongSoLuong / SO_DONG_MOI_TRANG);

    const truyVanLich = `
            SELECT 
                lh.lh_ma, lh.lh_khung_gio AS gio, lh.lh_ngay_hen AS ngay, lh.lh_loai,
                bn.bn_ho_ten AS ten_benh_nhan, lh.lh_trang_thai AS trang_thai, lh.lh_ghi_chu AS ghi_chu,
                bn.bn_sdt, lh.lh_da_xoa
            FROM lich_hen lh
            JOIN benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma
            ${chuoiDieuKien}
            ORDER BY lh.lh_ngay_hen DESC, lh.lh_khung_gio DESC
            LIMIT ${SO_DONG_MOI_TRANG} OFFSET ${viTriBatDau};
        `;

    const ketQua = await pool.query(truyVanLich, mangThamSo);

    danhSachLichHen = ketQua.rows.map((dong) => ({
      ...dong,
      trang_thai_hien_thi: dong.trang_thai,
    }));
  } catch (loi) {
    console.error(loi);
    return res.status(500).render("lichhen_danhsach", {
      title: "Lỗi tải dữ liệu",
      data: { appointments: [], totalCount: 0, totalPages: 0, currentPage: 1 },
      query: req.query || {},
    });
  }

  res.render("lichhen_danhsach", {
    title: "Quản Lý Lịch Hẹn",
    data: {
      appointments: danhSachLichHen,
      totalCount: tongSoLuong,
      totalPages: tongSoTrang, 
      currentPage: trangHienTai,
    },
    query: req.query,
  });
});

router.get("/api/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;
  try {
    const truyVan = `
        SELECT lh.*, bn.bn_ho_ten 
        FROM lich_hen lh 
        JOIN benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma 
        WHERE lh.lh_ma = $1;
    `;
    const ketQua = await pool.query(truyVan, [maLichHen]);

    if (ketQua.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
    }
    res.json(ketQua.rows[0]);
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
});

router.put("/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;
  const { ngay_hen, khung_gio, trang_thai, ghi_chu, loai } = req.body;

  if (!ngay_hen || !khung_gio || !trang_thai) {
    return res
      .status(400)
      .json({ message: "Thiếu thông tin bắt buộc (Ngày, Giờ, Trạng thái)" });
  }

  try {
    const truyVanCapNhat = `
            UPDATE lich_hen 
            SET 
                lh_ngay_hen = $1, 
                lh_khung_gio = $2, 
                lh_trang_thai = $3, 
                lh_ghi_chu = $4,
                lh_loai = COALESCE($5, lh_loai) 
            WHERE 
                lh_ma = $6 AND lh_da_xoa = FALSE
            RETURNING *;
        `;

    const ketQua = await pool.query(truyVanCapNhat, [
      ngay_hen,
      khung_gio,
      trang_thai,
      ghi_chu,
      loai,
      maLichHen,
    ]);

    if (ketQua.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lịch hẹn hoặc lịch đã bị xóa" });
    }

    res.status(200).json({
      message: "Cập nhật lịch hẹn thành công",
      updatedAppointment: ketQua.rows[0],
    });
  } catch (loi) {
    console.error("Lỗi cập nhật lịch hẹn:", loi);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
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
    "TAI_KHAM",
    "CHO_KHAM",
  ];

  if (!trang_thai_moi || !TRANG_THAI_HOP_LE.includes(trang_thai_moi)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  }

  try {
    const truyVanCapNhat = `UPDATE lich_hen SET lh_trang_thai = $1 WHERE lh_ma = $2 RETURNING lh_ma;`;
    const ketQua = await pool.query(truyVanCapNhat, [
      trang_thai_moi,
      maLichHen,
    ]);

    if (ketQua.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
    }

    res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      newStatus: trang_thai_moi,
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
});

router.delete("/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params;

  try {
    const truyVanXoa = `UPDATE lich_hen SET lh_da_xoa = TRUE WHERE lh_ma = $1`;
    const ketQua = await pool.query(truyVanXoa, [maLichHen]);

    if (ketQua.rowCount === 0) {
      return res.status(404).json({ message: "Lịch hẹn không tồn tại." });
    }

    res.status(200).json({ message: "Xóa thành công." });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Lỗi server." });
  }
});

router.get("/khung-gio-ban/:maLichHen", async (req, res) => {
  const { maLichHen } = req.params; 
  const { ngay } = req.query;

  if (!ngay) return res.status(400).json({ message: "Thiếu tham số ngày" });

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
    res.status(500).json({ message: "Lỗi server khi lấy khung giờ" });
  }
});

router.get("/them-moi", async (req, res) => {
  res.render("lichhen_them", {
    title: "Thêm Lịch Hẹn Mới",
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
    return res.status(400).json({ message: "Thiếu Ngày hoặc Khung giờ" });
  }

  try {
    ketNoi = await pool.connect();
    await ketNoi.query("BEGIN");

    // Nếu chưa có ID bệnh nhân -> Tạo bệnh nhân mới
    if (!bn_ma) {
      if (!bn_ho_ten || !bn_sdt || !bn_ngay_sinh) {
        await ketNoi.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Thiếu thông tin bệnh nhân mới" });
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

    const truyVanTrung = `
        SELECT 1 FROM lich_hen 
        WHERE lh_ngay_hen = $1 AND lh_khung_gio = $2 AND lh_trang_thai != 'DA_HUY' AND lh_da_xoa = FALSE
    `;
    const ketQuaTrung = await ketNoi.query(truyVanTrung, [ngay_hen, khung_gio]);
    if (ketQuaTrung.rowCount > 0) {
      await ketNoi.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Khung giờ này đã có người đặt." });
    }

    const truyVanThemLich = `
            INSERT INTO lich_hen (lh_ma_bn, lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu, lh_loai)
            VALUES ($1, $2, $3, $4, $5, 'MOI')
            RETURNING *;
        `;
    const ketQuaLich = await ketNoi.query(truyVanThemLich, [
      maBenhNhanDung,
      ngay_hen,
      khung_gio,
      trang_thai || "CHO_KHAM",
      ghi_chu,
    ]);

    await ketNoi.query("COMMIT");

    res.status(201).json({
      message: "Tạo lịch hẹn thành công",
      appointment: ketQuaLich.rows[0],
    });
  } catch (loi) {
    if (ketNoi) await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).json({ message: "Lỗi server khi tạo lịch hẹn" });
  } finally {
    if (ketNoi) ketNoi.release();
  }
});

router.post("/dat-lich-tai-kham", async (req, res) => {
  const { maBenhNhan, ngay_hen, khung_gio, trang_thai, ghi_chuchu, loai} = req.body;

  if (!maBenhNhan || !ngay_hen || !khung_gio) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
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
        .json({ message: "Khung giờ này đã có lịch hẹn khác" });
    }

    const truyVanThem = `
            INSERT INTO lich_hen (lh_ma_bn, lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu, lh_loai)
            VALUES ($1, $2, $3, $4, $5, 'TAI_KHAM')
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
      message: "Tạo lịch hẹn thành công",
      appointmentId: ketQua.rows[0].lh_ma,
    });
  } catch (loi) {
    if (ketNoi) await ketNoi.query("ROLLBACK");
    res.status(500).json({ message: "Lỗi server khi lưu lịch hẹn" });
  } finally {
    if (ketNoi) ketNoi.release();
  }
});

router.post("/tiep-don-ngay", async (req, res) => {
  const { maBenhNhan, ghiChu } = req.body;

  if (!maBenhNhan) {
    return res.status(400).json({ message: "Thiếu mã bệnh nhân" });
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
            lh_ghi_chu,
            lh_loai
        )
        VALUES ($1, CURRENT_DATE, $2, 'DA_DEN', $3, 'MOI')
        RETURNING lh_ma;
    `;

    const ketQua = await ketNoi.query(truyVanThem, [
      maBenhNhan,
      gioHienTai,
      ghiChu || "Tiếp đón vãng lai",
    ]);

    await ketNoi.query("COMMIT");

    res.json({
      success: true,
      maLichHen: ketQua.rows[0].lh_ma,
      message: "Đã tạo hồ sơ tiếp đón",
    });
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).json({ message: "Lỗi hệ thống khi tiếp đón" });
  } finally {
    ketNoi.release();
  }
});

module.exports = router;
