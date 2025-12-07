const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const TRUY_VAN_TONG_THUOC = `
    SELECT COALESCE(SUM(ctdt.ctdt_so_luong * cgt.cgt_gia_thuoc), 0) AS tong_tien_thuoc
    FROM chi_tiet_don_thuoc ctdt
    JOIN don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
    JOIN co_gia_thuoc cgt ON ctdt.ctdt_ma_thuoc = cgt.cgt_thuoc_ma
    WHERE dt.dt_ma_pkb = $1
    AND cgt.cgt_ngay_ap_dung = (
        SELECT MAX(trong.cgt_ngay_ap_dung) FROM co_gia_thuoc trong
        WHERE trong.cgt_thuoc_ma = ctdt.ctdt_ma_thuoc 
        AND trong.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
    );
`;

const TRUY_VAN_TONG_DICH_VU = `
    SELECT COALESCE(SUM(ctcd.ctcd_so_luong * cgdv.cgdv_gia_ddich_vu), 0) AS tong_tien_dich_vu
    FROM chi_tiet_chi_dinh ctcd
    JOIN phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
    JOIN co_gia_dich_vu cgdv ON ctcd.ctcd_ma_dvcls = cgdv.cgdv_dvcls_ma
    WHERE pcd.pcd_ma_pkb = $1
    AND cgdv.cgdv_ngay_ap_dung = (
        SELECT MAX(trong.cgdv_ngay_ap_dung) FROM co_gia_dich_vu trong
        WHERE trong.cgdv_dvcls_ma = ctcd.ctcd_ma_dvcls
        AND trong.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
    );
`;

const TRUY_VAN_CHI_TIET_THUOC = `
    SELECT t.t_ten_thuoc, ctdt.ctdt_so_luong, ctdt.ctdt_cach_dung, cgt.cgt_gia_thuoc,
    (ctdt.ctdt_so_luong * cgt.cgt_gia_thuoc) AS thanh_tien
    FROM chi_tiet_don_thuoc ctdt
    JOIN don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
    JOIN thuoc t ON ctdt.ctdt_ma_thuoc = t.t_ma
    JOIN co_gia_thuoc cgt ON ctdt.ctdt_ma_thuoc = cgt.cgt_thuoc_ma
    WHERE dt.dt_ma_pkb = $1
    AND cgt.cgt_ngay_ap_dung = (
        SELECT MAX(trong.cgt_ngay_ap_dung) FROM co_gia_thuoc trong
        WHERE trong.cgt_thuoc_ma = ctdt.ctdt_ma_thuoc 
        AND trong.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
    )
    ORDER BY t.t_ten_thuoc;
`;

const TRUY_VAN_CHI_TIET_DICH_VU = `
    SELECT dv.dvcls_ten, ctcd.ctcd_so_luong, cgdv.cgdv_gia_ddich_vu AS don_gia,
    (ctcd.ctcd_so_luong * cgdv.cgdv_gia_ddich_vu) AS thanh_tien
    FROM chi_tiet_chi_dinh ctcd
    JOIN phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
    JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
    JOIN co_gia_dich_vu cgdv ON ctcd.ctcd_ma_dvcls = cgdv.cgdv_dvcls_ma
    WHERE pcd.pcd_ma_pkb = $1
    AND cgdv.cgdv_ngay_ap_dung = (
        SELECT MAX(trong.cgdv_ngay_ap_dung) FROM co_gia_dich_vu trong
        WHERE trong.cgdv_dvcls_ma = ctcd.ctcd_ma_dvcls
        AND trong.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
    )
    ORDER BY dv.dvcls_ten;
`;

const TRUY_VAN_PTTT = `SELECT pttt_ma, pttt_ten FROM phuong_thuc_thanh_toan;`;

router.get("/lap-phieu/:maPhieuChiDinh", async (req, res) => {
  const maPhieuChiDinh = req.params.maPhieuChiDinh;

  try {
    const truyVanPkbTuPcd = `SELECT pcd_ma_pkb FROM phieu_chi_dinh WHERE pcd_ma = $1;`;
    const ketQuaPkb = await pool.query(truyVanPkbTuPcd, [maPhieuChiDinh]);

    if (ketQuaPkb.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay phieu kham goc" });
    }
    const maPhieuKham = ketQuaPkb.rows[0].pcd_ma_pkb;

    const truyVanThongTin = `
            SELECT pkb.pkb_ma, pkb.pkb_ma_bn, bn.bn_ho_ten
            FROM phieu_kham_benh pkb
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            WHERE pkb.pkb_ma = $1;
        `;
    const ketQuaThongTin = await pool.query(truyVanThongTin, [maPhieuKham]);

    if (ketQuaThongTin.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay phieu kham benh" });
    }

    const thongTinBenhNhan = ketQuaThongTin.rows[0];

    const ketQuaTienThuoc = await pool.query(TRUY_VAN_TONG_THUOC, [
      maPhieuKham,
    ]);
    const ketQuaTienDichVu = await pool.query(TRUY_VAN_TONG_DICH_VU, [
      maPhieuKham,
    ]);
    const ketQuaPttt = await pool.query(TRUY_VAN_PTTT);

    const tienThuoc = parseFloat(ketQuaTienThuoc.rows[0].tong_tien_thuoc || 0);
    const tienDichVu = parseFloat(
      ketQuaTienDichVu.rows[0].tong_tien_dich_vu || 0
    );
    const tongCong = tienThuoc + tienDichVu;

    const chiTietThuoc = await pool.query(TRUY_VAN_CHI_TIET_THUOC, [
      maPhieuKham,
    ]);
    const chiTietDichVu = await pool.query(TRUY_VAN_CHI_TIET_DICH_VU, [
      maPhieuKham,
    ]);

    res.render("thanhtoan_hoadon", {
      pkbMa: maPhieuKham,
      patientInfo: thongTinBenhNhan,
      tongTienThuoc: tienThuoc,
      tongTienDichVu: tienDichVu,
      tongCong: tongCong,
      ngayThanhToan: new Date().toISOString().slice(0, 10),
      chiTietThuoc: chiTietThuoc.rows,
      chiTietDichVu: chiTietDichVu.rows,
      ptttList: ketQuaPttt.rows,
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).render("loi_hethong", {
      message: "Loi he thong khi tai phieu thanh toan",
    });
  }
});

router.post("/luu", async (req, res) => {
  const maPhieuKham = req.body.pkb_ma;
  const tongTien = req.body.tong_cong;
  const phuongThuc = req.body.phuong_thuc_tt || "TIEN_MAT";

  const ketNoi = await pool.connect();

  try {
    await ketNoi.query("BEGIN");

    const truyVanThem = `
            INSERT INTO thanh_toan (tt_ma_pkb, tt_tong_tien, tt_thoi_gian_lap, tt_da_thanh_toan, tt_phuong_thuc)
            VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, $3)
            RETURNING tt_ma;
        `;
    const ketQua = await ketNoi.query(truyVanThem, [
      maPhieuKham,
      tongTien,
      phuongThuc,
    ]);
    const maThanhToan = ketQua.rows[0].tt_ma;

    await ketNoi.query("COMMIT");

    res.redirect(`/api/thanh-toan/thanh-cong/${maThanhToan}`);
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    res.status(500).render("loi_hethong", { message: "Loi luu thanh toan" });
  } finally {
    ketNoi.release();
  }
});

router.get("/thanh-cong/:maThanhToan", async (req, res) => {
  const maThanhToan = req.params.maThanhToan;

  try {
    const truyVan = `
            SELECT 
                tt.tt_ma, tt.tt_tong_tien, tt.tt_thoi_gian_lap, tt.tt_ma_pkb,
                bn.bn_ho_ten, pttt.pttt_ten
            FROM thanh_toan tt
            JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            JOIN phuong_thuc_thanh_toan pttt ON tt.tt_phuong_thuc = pttt.pttt_ma
            WHERE tt.tt_ma = $1;
        `;
    const ketQua = await pool.query(truyVan, [maThanhToan]);

    if (ketQua.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay phieu thanh toan" });
    }

    const hoaDon = ketQua.rows[0];
    const maPhieuKham = hoaDon.tt_ma_pkb;

    const ketQuaThuoc = await pool.query(TRUY_VAN_TONG_THUOC, [maPhieuKham]);
    const ketQuaDichVu = await pool.query(TRUY_VAN_TONG_DICH_VU, [maPhieuKham]);

    const tienThuoc = parseFloat(ketQuaThuoc.rows[0].tong_tien_thuoc || 0);
    const tienDichVu = parseFloat(ketQuaDichVu.rows[0].tong_tien_dich_vu || 0);
    const tongCong = tienThuoc + tienDichVu;

    const chiTietThuoc = await pool.query(TRUY_VAN_CHI_TIET_THUOC, [
      maPhieuKham,
    ]);
    const chiTietDichVu = await pool.query(TRUY_VAN_CHI_TIET_DICH_VU, [
      maPhieuKham,
    ]);

    res.render("thanhtoan_thanhcong", {
      invoice: hoaDon,
      title: `Thanh Toán Thành Công #${maThanhToan}`,
      tongTienThuoc: tienThuoc,
      tongTienDichVu: tienDichVu,
      tongCong: tongCong,
      chiTietThuoc: chiTietThuoc.rows,
      chiTietDichVu: chiTietDichVu.rows,
    });
  } catch (loi) {
    res
      .status(500)
      .render("loi_hethong", { message: "Loi hien thi xac nhan thanh toan" });
  }
});

router.post("/send-email", upload.single("file_hoa_don"), async (req, res) => {
  const { email, maHoaDon } = req.body;
  const filePDF = req.file; 

  if (!email || !maHoaDon) {
    return res
      .status(400)
      .json({ message: "Thiếu thông tin Email hoặc Mã hóa đơn." });
  }

  try {
    const query = `
        SELECT tt.tt_tong_tien, bn.bn_ho_ten, tt.tt_thoi_gian_lap
        FROM thanh_toan tt
        JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
        JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
        WHERE tt.tt_ma = $1
    `;
    const result = await pool.query(query, [maHoaDon]);
    if (result.rows.length === 0) throw new Error("Hóa đơn không tồn tại");

    const invoice = result.rows[0];
    const tongTien = parseFloat(invoice.tt_tong_tien).toLocaleString("vi-VN");
    const ngayLap = new Date(invoice.tt_thoi_gian_lap).toLocaleDateString(
      "vi-VN"
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "thaib2203469@student.ctu.edu.vn",
        pass: "mhde xcdq bbwz cord",
      },
    });

    const mailOptions = {
      from: '"Phòng Khám Đa Khoa" <no-reply@phongkham.com>',
      to: email,
      subject: `Hóa đơn điện tử ${maHoaDon} - Phòng Khám Đa Khoa`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3 style="color: #198754;">HÓA ĐƠN ĐIỆN TỬ</h3>
            <p>Xin chào <strong>${invoice.bn_ho_ten}</strong>,</p>
            <p>Phòng khám xin gửi quý khách hóa đơn thanh toán ngày ${ngayLap}.</p>
            <p>Tổng cộng: <strong style="color: #d32f2f; font-size: 16px;">${tongTien} VNĐ</strong></p>
            <p>Vui lòng xem chi tiết trong file PDF đính kèm.</p>
            <hr>
            <p style="font-size: 12px; color: #888;">Cảm ơn quý khách đã sử dụng dịch vụ!</p>
        </div>
      `,
      attachments: [],
    };

    if (filePDF) {
      mailOptions.attachments.push({
        filename: `Hoa_Don_${maHoaDon}.pdf`,
        content: filePDF.buffer,
        contentType: "application/pdf",
      });
    }

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Đã gửi hóa đơn kèm PDF thành công!" });
  } catch (error) {
    console.error("Lỗi gửi mail:", error);
    res.status(500).json({ message: "Lỗi khi gửi email: " + error.message });
  }
});

module.exports = router;
