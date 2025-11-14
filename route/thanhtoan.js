const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const QUERY_TONG_THUOC = `
    SELECT
        COALESCE(SUM(ctdt.ctdt_so_luong * cgt.cgt_gia_thuoc), 0) AS tong_tien_thuoc
    FROM
        chi_tiet_don_thuoc ctdt
    JOIN
        don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
    JOIN
        co_gia_thuoc cgt ON ctdt.ctdt_ma_thuoc = cgt.cgt_thuoc_ma
    WHERE
        dt.dt_ma_pkb = $1
        AND cgt.cgt_ngay_ap_dung = (
            SELECT 
                MAX(inner_cgt.cgt_ngay_ap_dung)
            FROM 
                co_gia_thuoc inner_cgt
            WHERE 
                inner_cgt.cgt_thuoc_ma = ctdt.ctdt_ma_thuoc 
                AND inner_cgt.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
        );
`;

const QUERY_TONG_DICH_VU = `
    SELECT
        COALESCE(SUM(ctcd.ctcd_so_luong * cgdv.cgdv_gia_dich_vu), 0) AS tong_tien_dich_vu
    FROM
        chi_tiet_chi_dinh ctcd
    JOIN
        phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
    JOIN
        co_gia_dich_vu cgdv ON ctcd.ctcd_ma_dvcls = cgdv.cgdv_dvcls_ma
    WHERE
        pcd.pcd_ma_pkb = $1
        AND cgdv.cgdv_ngay_ap_dung = (
            SELECT 
                MAX(inner_cgdv.cgdv_ngay_ap_dung)
            FROM 
                co_gia_dich_vu inner_cgdv
            WHERE 
                inner_cgdv.cgdv_dvcls_ma = ctcd.ctcd_ma_dvcls
                AND inner_cgdv.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
        );
`;

router.get("/lap-phieu/:pkbMa", async (req, res) => {
  const pkbMa = req.params.pkbMa;

  try {
    const pkbQuery = `
            SELECT pkb.pkb_ma, pkb.pkb_ma_bn, bn.bn_ho_ten
            FROM phieu_kham_benh pkb
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            WHERE pkb.pkb_ma = $1;
        `;
    const pkbResult = await pool.query(pkbQuery, [pkbMa]);

    if (pkbResult.rows.length === 0) {
      return res.status(404).render("error_page", {
        message: `Không tìm thấy Phiếu Khám Bệnh #${pkbMa}.`,
      });
    }

    const patientInfo = pkbResult.rows[0];

    const drugCostRes = await pool.query(QUERY_TONG_THUOC, [pkbMa]);
    const serviceCostRes = await pool.query(QUERY_TONG_DICH_VU, [pkbMa]);

    const tongTienThuoc = parseFloat(drugCostRes.rows[0].tong_tien_thuoc || 0);
    const tongTienDichVu = parseFloat(
      serviceCostRes.rows[0].tong_tien_dich_vu || 0
    );
    const tongCong = tongTienThuoc + tongTienDichVu;

    res.render("thanhtoan_form", {
      pkbMa: pkbMa,
      patientInfo: patientInfo,
      tongTienThuoc: tongTienThuoc,
      tongTienDichVu: tongTienDichVu,
      tongCong: tongCong,
      ngayThanhToan: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("LỖI KHI TẢI PHIẾU THANH TOÁN:", error);
    res.status(500).render("error_page", {
      message: "Lỗi hệ thống khi tải phiếu thanh toán.",
    });
  }
});

router.post("/save", async (req, res) => {
  const pkbMa = req.body.pkb_ma;
  const tongTien = req.body.tong_cong;
  const phuongThuc = req.body.phuong_thuc_tt || "TIEN_MAT";
  const maNguoiTao = req.user.ma;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertQuery = `
            INSERT INTO phieu_thanh_toan (ptt_ma_pkb, ptt_ngay_lap, ptt_tong_tien, ptt_phuong_thuc, ptt_nguoi_lap)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)
            RETURNING ptt_ma;
        `;
    const insertRes = await client.query(insertQuery, [
      pkbMa,
      tongTien,
      phuongThuc,
      maNguoiTao,
    ]);
    const pttMa = insertRes.rows[0].ptt_ma;

    const updatePkbQuery = `
            UPDATE phieu_kham_benh
            SET pkb_trang_thai = 'DA_THANH_TOAN'
            WHERE pkb_ma = $1;
        `;
    await client.query(updatePkbQuery, [pkbMa]);

    await client.query("COMMIT");

    res.redirect(`/api/thanhtoan/success/${pttMa}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("LỖI KHI LƯU PHIẾU THANH TOÁN:", error);
    res.status(500).render("error_page", {
      message: "Lỗi hệ thống khi lưu thanh toán. Dữ liệu đã được hoàn tác.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
