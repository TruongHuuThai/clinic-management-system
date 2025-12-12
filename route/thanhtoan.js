const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");
const multer = require("multer");
const upload = multer();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "thaib2203469@student.ctu.edu.vn",
    pass: "huhz zzlu oglv twbz",
  },
});

router.get("/lap-phieu/:pkbMa", async (req, res) => {
  const pkbMa = req.params.pkbMa;

  try {
    const queryInfo = `
            SELECT 
                pkb.pkb_ma, pkb.pkb_trieu_chung, 
                pkb.pkb_ghi_chu,
                pkb.pkb_loi_dan,
                pkb.pkb_chi_dinh_ngoai,
                pkb.pkb_ngay_tai_kham,
                bn.bn_ma, bn.bn_ho_ten, bn.bn_la_nam, bn.bn_ngay_sinh, bn.bn_dia_chi, bn.bn_sdt, bn.bn_tien_su,
                COALESCE(
                    STRING_AGG(DISTINCT CONCAT(b.b_ma_icd, ' - ', b.b_ten), '; '), 
                    'Chưa có chẩn đoán'
                ) AS chan_doan_benh
            FROM phieu_kham_benh pkb
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            LEFT JOIN don_thuoc dt ON pkb.pkb_ma = dt.dt_ma_pkb
            LEFT JOIN chan_doan cd ON dt.dt_ma = cd.cd_ma_dt
            LEFT JOIN benh b ON cd.cd_ma_benh = b.b_ma
            WHERE pkb.pkb_ma = $1
            GROUP BY pkb.pkb_ma, bn.bn_ma
        `;
    const resInfo = await pool.query(queryInfo, [pkbMa]);

    if (resInfo.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Không tìm thấy phiếu khám" });
    }
    const patientInfo = resInfo.rows[0];

    const queryThuoc = `
            SELECT 
                t.t_ten_thuoc, 
                ctdt.ctdt_so_luong, 
                ctdt.ctdt_cach_dung, 
                ctdt.ctdt_lieu_dung,
                t.t_don_vi_tinh,
                COALESCE(cgt.cgt_gia_thuoc, 0) AS don_gia,
                (ctdt.ctdt_so_luong * COALESCE(cgt.cgt_gia_thuoc, 0)) AS thanh_tien
            FROM chi_tiet_don_thuoc ctdt
            JOIN don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
            JOIN thuoc t ON ctdt.ctdt_ma_thuoc = t.t_ma
            LEFT JOIN co_gia_thuoc cgt ON t.t_ma = cgt.cgt_thuoc_ma
                AND cgt.cgt_ngay_ap_dung = (
                    SELECT MAX(sub.cgt_ngay_ap_dung)
                    FROM co_gia_thuoc sub
                    WHERE sub.cgt_thuoc_ma = t.t_ma
                    AND sub.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
                )
            WHERE dt.dt_ma_pkb = $1
            ORDER BY t.t_ten_thuoc
        `;
    const resThuoc = await pool.query(queryThuoc, [pkbMa]);
    const chiTietThuoc = resThuoc.rows;
    const tongTienThuoc = chiTietThuoc.reduce(
      (sum, item) => sum + parseFloat(item.thanh_tien),
      0
    );

    const queryDichVu = `
            SELECT 
                dv.dvcls_ten,
                COALESCE(cg.cgdv_gia_ddich_vu, 0) AS don_gia
            FROM chi_tiet_chi_dinh ctcd
            JOIN phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
            JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
            LEFT JOIN co_gia_dich_vu cg ON dv.dvcls_ma = cg.cgdv_ma_dvcls
                AND cg.cgdv_ngay_ap_dung = (
                    SELECT MAX(sub.cgdv_ngay_ap_dung)
                    FROM co_gia_dich_vu sub
                    WHERE sub.cgdv_ma_dvcls = dv.dvcls_ma
                    AND sub.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
                )
            WHERE pcd.pcd_ma_pkb = $1
            ORDER BY dv.dvcls_ten
    `;
    const resDichVu = await pool.query(queryDichVu, [pkbMa]);
    const chiTietDichVu = resDichVu.rows;
    const tongTienDichVu = chiTietDichVu.reduce(
      (sum, item) => sum + parseFloat(item.don_gia),
      0
    );

    const tienKham = 150000;
    const tongCong = tongTienThuoc + tongTienDichVu + tienKham;
    const resPTTT = await pool.query("SELECT * FROM phuong_thuc_thanh_toan");

    res.render("thanhtoan_hoadon", {
      pkbMa: pkbMa,
      patientInfo: patientInfo,
      chiTietThuoc: chiTietThuoc,
      chiTietDichVu: chiTietDichVu,
      tongTienThuoc: tongTienThuoc,
      tongTienDichVu: tongTienDichVu,
      tienKham: tienKham,
      tongCong: tongCong,
      ptttList: resPTTT.rows,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("loi_hethong", {
        message: "Lỗi hệ thống khi tải trang thanh toán.",
      });
  }
});

router.post("/luu", async (req, res) => {
  const {
    pkb_ma,
    tong_cong,
    phuong_thuc_tt,
    chi_dinh_ngoai,
    chi_dinh_khac_text,
    loi_dan_them,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let strChiDinhNgoai = null;
    let danhSachChiDinh = [];

    if (chi_dinh_ngoai) {
      const arrChiDinh = Array.isArray(chi_dinh_ngoai)
        ? chi_dinh_ngoai
        : [chi_dinh_ngoai];
      arrChiDinh.forEach((item) => {
        if (item === "none") return;
        if (item === "other") {
          if (chi_dinh_khac_text && chi_dinh_khac_text.trim() !== "") {
            danhSachChiDinh.push(chi_dinh_khac_text.trim());
          }
        } else {
          danhSachChiDinh.push(item);
        }
      });
    }

    if (danhSachChiDinh.length > 0) {
      strChiDinhNgoai = danhSachChiDinh.join(", ");
    }

    let strLoiDan = null;
    if (loi_dan_them && loi_dan_them.trim() !== "") {
      strLoiDan = loi_dan_them.trim();
    }

    if (strChiDinhNgoai !== null || strLoiDan !== null) {
      await client.query(
        `UPDATE phieu_kham_benh 
         SET pkb_chi_dinh_ngoai = $1, pkb_loi_dan = $2 
         WHERE pkb_ma = $3`,
        [strChiDinhNgoai, strLoiDan, pkb_ma]
      );
    }

    const soTien =
      parseInt(tong_cong.toString().replace(/\./g, "").replace(/,/g, "")) || 0;

    const checkTT = await client.query(
      "SELECT tt_ma FROM thanh_toan WHERE tt_ma_pkb = $1",
      [pkb_ma]
    );
    let maThanhToan;

    if (checkTT.rows.length > 0) {
      const updateTT = `
                UPDATE thanh_toan 
                SET tt_tong_tien=$1, tt_phuong_thuc=$2, tt_da_thanh_toan=true, tt_thoi_gian_lap=CURRENT_TIMESTAMP
                WHERE tt_ma_pkb=$3
                RETURNING tt_ma
            `;
      const resUpdate = await client.query(updateTT, [
        soTien,
        phuong_thuc_tt,
        pkb_ma,
      ]);
      maThanhToan = resUpdate.rows[0].tt_ma;
    } else {
      const insertTT = `
                INSERT INTO thanh_toan (tt_ma_pkb, tt_tong_tien, tt_thoi_gian_lap, tt_da_thanh_toan, tt_phuong_thuc)
                VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, $3)
                RETURNING tt_ma
            `;
      const resInsert = await client.query(insertTT, [
        pkb_ma,
        soTien,
        phuong_thuc_tt,
      ]);
      maThanhToan = resInsert.rows[0].tt_ma;
    }

    await client.query("COMMIT");
    res.redirect(`/api/thanh-toan/thanh-cong/${maThanhToan}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res
      .status(500)
      .render("loi_hethong", { message: "Lỗi khi lưu thanh toán." });
  } finally {
    client.release();
  }
});

router.get("/thanh-cong/:maThanhToan", async (req, res) => {
  const maThanhToan = req.params.maThanhToan;

  try {
    const queryInvoice = `
            SELECT 
                tt.tt_ma, tt.tt_tong_tien, tt.tt_thoi_gian_lap, tt.tt_ma_pkb, tt.tt_phuong_thuc,
                bn.bn_ma, bn.bn_ho_ten, bn.bn_la_nam, bn.bn_ngay_sinh, bn.bn_dia_chi, bn.bn_sdt, bn.bn_tien_su,
                pkb.pkb_trieu_chung, 
                pkb.pkb_ghi_chu,
                pkb.pkb_loi_dan,
                pkb.pkb_chi_dinh_ngoai,
                pkb.pkb_ngay_tai_kham,
                COALESCE(
                    STRING_AGG(DISTINCT CONCAT(b.b_ma_icd, ' - ', b.b_ten), '; '), 
                    'Chưa có chẩn đoán'
                ) AS chan_doan_benh
            FROM thanh_toan tt
            JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            LEFT JOIN don_thuoc dt ON pkb.pkb_ma = dt.dt_ma_pkb
            LEFT JOIN chan_doan cd ON dt.dt_ma = cd.cd_ma_dt
            LEFT JOIN benh b ON cd.cd_ma_benh = b.b_ma
            WHERE tt.tt_ma = $1
            GROUP BY tt.tt_ma, bn.bn_ma, pkb.pkb_ma
        `;
    const resInvoice = await pool.query(queryInvoice, [maThanhToan]);

    if (resInvoice.rows.length === 0)
      return res.status(404).send("Không tìm thấy hóa đơn");
    const invoice = resInvoice.rows[0];

    const queryThuoc = `
            SELECT 
                t.t_ten_thuoc, ctdt.ctdt_so_luong, ctdt.ctdt_cach_dung, t.t_don_vi_tinh,
                COALESCE(cgt.cgt_gia_thuoc, 0) AS don_gia,
                (ctdt.ctdt_so_luong * COALESCE(cgt.cgt_gia_thuoc, 0)) AS thanh_tien
            FROM chi_tiet_don_thuoc ctdt
            JOIN don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
            JOIN thuoc t ON ctdt.ctdt_ma_thuoc = t.t_ma
            LEFT JOIN co_gia_thuoc cgt ON t.t_ma = cgt.cgt_thuoc_ma
                AND cgt.cgt_ngay_ap_dung = (
                    SELECT MAX(sub.cgt_ngay_ap_dung) FROM co_gia_thuoc sub
                    WHERE sub.cgt_thuoc_ma = t.t_ma AND sub.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
                )
            WHERE dt.dt_ma_pkb = $1
            ORDER BY t.t_ten_thuoc
        `;
    const resThuoc = await pool.query(queryThuoc, [invoice.tt_ma_pkb]);

    const queryDichVu = `
            SELECT dv.dvcls_ten, COALESCE(cg.cgdv_gia_ddich_vu, 0) AS don_gia
            FROM chi_tiet_chi_dinh ctcd
            JOIN phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
            JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
            LEFT JOIN co_gia_dich_vu cg ON dv.dvcls_ma = cg.cgdv_ma_dvcls
                AND cg.cgdv_ngay_ap_dung = (
                    SELECT MAX(sub.cgdv_ngay_ap_dung) FROM co_gia_dich_vu sub
                    WHERE sub.cgdv_ma_dvcls = dv.dvcls_ma AND sub.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
                )
            WHERE pcd.pcd_ma_pkb = $1
    `;
    const resDichVu = await pool.query(queryDichVu, [invoice.tt_ma_pkb]);

    const tongTienThuoc = resThuoc.rows.reduce(
      (sum, i) => sum + parseFloat(i.thanh_tien),
      0
    );
    const tongTienDichVu = resDichVu.rows.reduce(
      (sum, i) => sum + parseFloat(i.don_gia),
      0
    );

    res.render("thanhtoan_thanhcong", {
      invoice: invoice,
      chiTietThuoc: resThuoc.rows,
      chiTietDichVu: resDichVu.rows,
      tongTienThuoc: tongTienThuoc,
      tongTienDichVu: tongTienDichVu,
      tienKham: 150000,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
});

router.post("/send-email", upload.single("file_hoa_don"), async (req, res) => {
  try {
    const { email, maHoaDon } = req.body;
    const filePDF = req.file;
    if (!email || !filePDF)
      return res.status(400).json({ message: "Thiếu thông tin." });

    const mailOptions = {
      from: '"Phòng Khám" <no-reply@phongkham.com>',
      to: email,
      subject: `Hóa đơn số ${maHoaDon}`,
      html: `<h3>Cảm ơn quý khách!</h3><p>Hóa đơn đính kèm.</p>`,
      attachments: [
        { filename: `Hoa_Don_${maHoaDon}.pdf`, content: filePDF.buffer },
      ],
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: "Gửi email thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gửi email thất bại" });
  }
});

module.exports = router;
