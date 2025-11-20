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
        COALESCE(SUM(ctcd.ctcd_so_luong * cgdv.cgdv_gia_ddich_vu), 0) AS tong_tien_dich_vu
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

const QUERY_CHI_TIET_THUOC = `
    SELECT
        t.t_ten_thuoc,
        ctdt.ctdt_so_luong,
        ctdt.ctdt_cacl_dung,
        cgt.cgt_gia_thuoc,
        (ctdt.ctdt_so_luong * cgt.cgt_gia_thuoc) AS thanh_tien
    FROM
        chi_tiet_don_thuoc ctdt
    JOIN
        don_thuoc dt ON ctdt.ctdt_ma_dt = dt.dt_ma
    JOIN
        thuoc t ON ctdt.ctdt_ma_thuoc = t.t_ma
    JOIN
        co_gia_thuoc cgt ON ctdt.ctdt_ma_thuoc = cgt.cgt_thuoc_ma
    WHERE
        dt.dt_ma_pkb = $1
        AND cgt.cgt_ngay_ap_dung = (
            SELECT MAX(inner_cgt.cgt_ngay_ap_dung)
            FROM co_gia_thuoc inner_cgt
            WHERE inner_cgt.cgt_thuoc_ma = ctdt.ctdt_ma_thuoc 
            AND inner_cgt.cgt_ngay_ap_dung <= CURRENT_TIMESTAMP
        )
    ORDER BY t.t_ten_thuoc;
`;

const QUERY_CHI_TIET_DICH_VU = `
    SELECT
        dv.dvcls_ten,
        ctcd.ctcd_so_luong,
        cgdv.cgdv_gia_ddich_vu AS don_gia,
        (ctcd.ctcd_so_luong * cgdv.cgdv_gia_ddich_vu) AS thanh_tien
    FROM
        chi_tiet_chi_dinh ctcd
    JOIN
        phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
    JOIN
        dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
    JOIN
        co_gia_dich_vu cgdv ON ctcd.ctcd_ma_dvcls = cgdv.cgdv_dvcls_ma
    WHERE
        pcd.pcd_ma_pkb = $1
        AND cgdv.cgdv_ngay_ap_dung = (
            SELECT MAX(inner_cgdv.cgdv_ngay_ap_dung)
            FROM co_gia_dich_vu inner_cgdv
            WHERE inner_cgdv.cgdv_dvcls_ma = ctcd.ctcd_ma_dvcls
            AND inner_cgdv.cgdv_ngay_ap_dung <= CURRENT_TIMESTAMP
        )
    ORDER BY dv.dvcls_ten;
`;

const QUERY_PHUONG_THUC_TT = `
    SELECT pttt_ma, pttt_ten 
    FROM phuong_thuc_thanh_toan;
`;

router.get("/lap-phieu/:pcdMa", async (req, res) => {
  const pcdMa = req.params.pcdMa;

  try {
    const getPkbMaQuery = `
        SELECT pcd_ma_pkb 
        FROM phieu_chi_dinh 
        WHERE pcd_ma = $1;
    `;
    const pkbResFromPCD = await pool.query(getPkbMaQuery, [pcdMa]);

    if (pkbResFromPCD.rows.length === 0) {
    return res.status(404).render("error_page", {
        message: `Không tìm thấy Phiếu Khám Bệnh gốc cho Phiếu Chỉ Định #${pcdMa}.`,
    });
    }
    const pkbMa = pkbResFromPCD.rows[0].pcd_ma_pkb;

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
    const ptttResult = await pool.query(QUERY_PHUONG_THUC_TT);

    const tongTienThuoc = parseFloat(drugCostRes.rows[0].tong_tien_thuoc || 0);
    const tongTienDichVu = parseFloat(
      serviceCostRes.rows[0].tong_tien_dich_vu || 0
    );
    const tongCong = tongTienThuoc + tongTienDichVu;

    const chiTietThuocRes = await pool.query(QUERY_CHI_TIET_THUOC, [pkbMa]);
    const chiTietDichVuRes = await pool.query(QUERY_CHI_TIET_DICH_VU, [pkbMa]);

    res.render("thanhtoan_form", {
      pkbMa: pkbMa,
      patientInfo: patientInfo,
      tongTienThuoc: tongTienThuoc,
      tongTienDichVu: tongTienDichVu,
      tongCong: tongCong,
      ngayThanhToan: new Date().toISOString().slice(0, 10),
      chiTietThuoc: chiTietThuocRes.rows,
      chiTietDichVu: chiTietDichVuRes.rows,
      ptttList: ptttResult.rows,
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertQuery = `
            INSERT INTO thanh_toan (tt_ma_pkb, tt_tong_tien, tt_thoi_gian_lap, tt_da_thanh_toan, tt_phuong_thuc)
            VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, $3)
            RETURNING tt_ma;
        `;
    const insertRes = await client.query(insertQuery, [
      pkbMa, 
      tongTien, 
      phuongThuc, 
    ]);
    const pttMa = insertRes.rows[0].tt_ma; 

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

router.get('/success/:pttMa', async (req, res) => {
    const pttMa = req.params.pttMa;

    try {
        const query = `
            SELECT 
                tt.tt_ma, 
                tt.tt_tong_tien,
                tt.tt_thoi_gian_lap,
                bn.bn_ho_ten,
                pttt.pttt_ten
            FROM thanh_toan tt
            JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            JOIN phuong_thuc_thanh_toan pttt ON tt.tt_phuong_thuc = pttt.pttt_ma
            WHERE tt.tt_ma = $1;
        `;
        const result = await pool.query(query, [pttMa]);

        if (result.rows.length === 0) {
            return res.status(404).render('error_page', { message: `Không tìm thấy Phiếu Thanh Toán #${pttMa}.` });
        }

        const invoice = result.rows[0];

        res.render('payment_success_page', {
            invoice: invoice,
            title: `Thanh Toán Thành Công #${pttMa}`
        });

    } catch (error) {
        console.error("LỖI KHI TẢI TRANG XÁC NHẬN THANH TOÁN:", error);
        res.status(500).render('error_page', { message: 'Lỗi hệ thống khi hiển thị xác nhận thanh toán.' });
    }
});

module.exports = router;
