const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    let appointmentsList = [];
    let totalRevenue = '0 VNĐ';
    let waitingPatientsList = [];

    try {
        const appointmentsQuery = `
            SELECT 
                lh.lh_ma,
                lh.lh_khung_gio AS time,
                bn.bn_ho_ten AS name,
                lh.lh_trang_thai AS status,
                lh.lh_ghi_chu AS note
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
        appointmentsList = appointmentResult.rows.map(row => ({
            ...row,
            lh_ma: row.lh_ma,
            status: row.status.replace(/_/g, ' ')
        }));
        const revenueQuery = `
            SELECT COALESCE(SUM(tt.tt_tong_tien), 0) AS total_revenue
            FROM thanh_toan tt
            JOIN phieu_kham_benh pkb ON tt.tt_ma_pkb = pkb.pkb_ma
            WHERE DATE(pkb.pkb_ngay_kham) = CURRENT_DATE AND tt.tt_da_thanh_toan = TRUE;
        `;
        const revenueResult = await pool.query(revenueQuery);
        const revenueAmount = parseFloat(revenueResult.rows[0].total_revenue).toLocaleString('vi-VN');
        totalRevenue = `${revenueAmount} VNĐ`;

        const waitingPatientsQuery = `
            SELECT 
                bn.bn_ho_ten AS name, pkb.pkb_ma, tt.tt_da_thanh_toan, pcd.pcd_trang_thai
            FROM phieu_kham_benh pkb
            JOIN benh_nhan bn ON pkb.pkb_ma_bn = bn.bn_ma
            LEFT JOIN thanh_toan tt ON pkb.pkb_ma = tt.tt_ma_pkb
            LEFT JOIN phieu_chi_dinh pcd ON pkb.pkb_ma = pcd.pcd_ma_pkb
            WHERE DATE(pkb.pkb_ngay_kham) = CURRENT_DATE 
            AND (tt.tt_da_thanh_toan IS NULL OR tt.tt_da_thanh_toan = FALSE OR pcd.pcd_trang_thai != 'DA_HOAN_THANH')
            ORDER BY pkb.pkb_ngay_kham;
        `;

        const waitingResult = await pool.query(waitingPatientsQuery);
        waitingPatientsList = waitingResult.rows.map(row => {
            let statusDetail = 'Đang khám/Theo dõi';
            if (row.tt_da_thanh_toan === false || row.tt_da_thanh_toan === null) {
                statusDetail = 'Đang chờ thanh toán';
            }
            if (row.pcd_trang_thai && row.pcd_trang_thai !== 'DA_HOAN_THANH') {
                statusDetail = 'Đang chờ kết quả CLS';
            }
            return { name: row.name, status: statusDetail, pkb_ma: row.pkb_ma };
        });

    } catch (error) {
        console.error('LỖI KẾT NỐI/TRUY VẤN CSDL:', error.message);
        appointmentsList = [];
        totalRevenue = 'LỖI CSDL';
        waitingPatientsList = [];
    }
    const dashboardData = {
        userName: 'Bác sĩ Phòng Khám (Quản trị)',
        kpi: {
            appointments: appointmentsList.length,
            waiting: appointmentsList.filter(a => a.status === 'DA DEN').length,
            revenue: totalRevenue
        },
        appointmentsList: appointmentsList,
        waitingPatients: waitingPatientsList
    };

    res.render('dashboard', {
        title: 'Bảng Điều Khiển',
        data: dashboardData
    });
})

module.exports = router;