const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  let totalRevenue = "0 VNĐ";

  try {
    const appointmentsQuery = `
            SELECT 
                lh.lh_ma,
                lh.lh_khung_gio,
                bn.bn_ho_ten,
                lh.lh_trang_thai,
                lh.lh_ghi_chu
            FROM 
                lich_hen lh
            JOIN 
                benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma
            WHERE 
                lh.lh_ngay_hen = CURRENT_DATE
            ORDER BY
                lh.lh_khung_gio;
        `;

    const appointmentResult = await pool.query(appointmentsQuery);
    const appointmentsList = appointmentResult.rows.map((row) => {
      return {
        lh_ma: row.lh_ma,
        lh_khung_gio: row.lh_khung_gio,
        bn_ho_ten: row.bn_ho_ten,
        lh_trang_thai: row.lh_trang_thai,
        lh_ghi_chu: row.lh_ghi_chu,
        statusKey: row.lh_trang_thai,
      };
    });

    const revenueQuery = `
            SELECT COALESCE(SUM(tt.tt_tong_tien), 0) AS total_revenue
            FROM thanh_toan tt
            JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
            WHERE DATE(pkb.pkb_ngay_kham) = CURRENT_DATE AND tt.tt_da_thanh_toan = TRUE;
        `;
    const revenueResult = await pool.query(revenueQuery);
    const revenueAmount = parseFloat(
      revenueResult.rows[0].total_revenue
    ).toLocaleString("vi-VN");
    totalRevenue = `${revenueAmount} VNĐ`;

    const waitingPatientsQuery = `
            SELECT 
                pkb.pkb_ma,
                bn.bn_ho_ten,
                tt.tt_da_thanh_toan,
                
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT('ten_dv', dv.dvcls_ten, 'trang_thai', ctcd.ctcd_trang_thai)
                    ) FILTER (WHERE ctcd.ctcd_trang_thai IS NOT NULL AND ctcd.ctcd_trang_thai != 'DA_CO_KET_QUA' AND ctcd.ctcd_trang_thai != 'HUY'),
                    '[]'::json
                ) AS pending_services
                
            FROM phieu_kham_benh pkb
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
          
            LEFT JOIN thanh_toan tt ON pkb.pkb_ma = tt.tt_ma_pkb
            
            LEFT JOIN phieu_chi_dinh pcd ON pkb.pkb_ma = pcd.pcd_ma_pkb
            LEFT JOIN chi_tiet_chi_dinh ctcd ON pcd.pcd_ma = ctcd.ctcd_ma_pcd
            LEFT JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma

            WHERE DATE(pkb.pkb_ngay_kham) = CURRENT_DATE 
            AND (
                EXISTS (
                    SELECT 1 FROM chi_tiet_chi_dinh sub_ctcd 
                    JOIN phieu_chi_dinh sub_pcd ON sub_ctcd.ctcd_ma_pcd = sub_pcd.pcd_ma
                    WHERE sub_pcd.pcd_ma_pkb = pkb.pkb_ma 
                    AND sub_ctcd.ctcd_trang_thai NOT IN ('DA_CO_KET_QUA', 'HUY')
                )
            )
            GROUP BY pkb.pkb_ma, bn.bn_ho_ten, tt.tt_da_thanh_toan
            ORDER BY pkb.pkb_ngay_kham;
        `;

    const waitingResult = await pool.query(waitingPatientsQuery);

    const waitingPatientsList = waitingResult.rows.map((row) => {
      const pendingServices = row.pending_services;

      let statusDetail = "Đã hoàn tất Khám";

      if (pendingServices.length > 0) {
        statusDetail = "CLS: Chờ kết quả";
      } else if (
        row.tt_da_thanh_toan === false ||
        row.tt_da_thanh_toan === null
      ) {
        statusDetail = "Chờ thanh toán";
      }

      return {
        name: row.bn_ho_ten,
        pkb_ma: row.pkb_ma,
        status: statusDetail,
        pendingServices: pendingServices,
      };
    });

    const waitingForExamCount = appointmentsList.filter(
      (a) => a.lh_trang_thai === "DA_DEN"
    ).length;

    const dashboardData = {
      kpi: {
        appointments: appointmentsList.length,
        waiting: waitingForExamCount,
        revenue: totalRevenue,
      },
      appointmentsList: appointmentsList,
      waitingPatients: waitingPatientsList,
    };

    res.render("trangchu", {
      title: "Bảng Điều Khiển",
      data: dashboardData,
    });
  } catch (error) {
    console.error("LỖI KHI TẢI DASHBOARD:", error);
    res.status(500).render("error_page", {
      message: "Lỗi hệ thống khi tải trang Dashboard.",
    });
  }
});

module.exports = router;
