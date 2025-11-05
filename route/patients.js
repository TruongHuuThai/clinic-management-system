// route/patients.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');


router.get('/', async (req, res) => {
    try {
        const patientsQuery = `
            SELECT 
                bn_ma, bn_ho_ten, bn_sdt, bn_dia_chi
            FROM 
                benh_nhan
            ORDER BY 
                bn_ho_ten;
        `;
        
        const result = await pool.query(patientsQuery);
        
        res.render('patient_list', { 
            title: 'Danh sách Bệnh nhân',
            patients: result.rows 
        });

    } catch (error) {
        console.error('LỖI KHI TẢI DANH SÁCH BỆNH NHÂN:', error);
        res.status(500).json({ 
            message: 'Không thể tải danh sách bệnh nhân.',
            error_details: error.message 
        });
    }
});

// --- 2. Router Xem Chi tiết Bệnh nhân (GET /patients/:id) ---
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    // Khai báo các truy vấn SQL
    const patientQuery = `
        SELECT bn_ma, bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
        FROM benh_nhan
        WHERE bn_ma = $1;
    `;

    const historyQuery = `
        SELECT 
            lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu, lh_ma
        FROM 
            lich_hen
        WHERE 
            lh_ma_bn = $1 AND lh_da_xoa = FALSE
        ORDER BY 
            lh_ngay_hen DESC;
    `;

    try {
        const [patientResult, historyResult] = await Promise.all([
            pool.query(patientQuery, [id]),
            pool.query(historyQuery, [id])
        ]);

        if (patientResult.rowCount === 0) {
            return res.status(404).send('<h1>404 Not Found</h1><p>Không tìm thấy bệnh nhân với Mã: ' + id + '</p>');
        }
        const patientData = patientResult.rows[0];

        const appointmentsHistory = historyResult.rows.map(row => {
            const formattedDate = row.lh_ngay_hen ? new Date(row.lh_ngay_hen).toLocaleDateString('vi-VN') : 'Chưa có ngày';
            const formattedStatus = row.lh_trang_thai ? row.lh_trang_thai.replace(/_/g, ' ') : 'Không xác định';

            return {
                ...row,
                lh_ngay_hen: formattedDate,
                lh_trang_thai: formattedStatus
            };
        });

        res.render('patient_detail', { 
            title: `Hồ Sơ Bệnh Nhân: ${patientData.bn_ho_ten}`,
            patient: patientData,
            history: appointmentsHistory
        });

    } catch (error) {
        console.error(`LỖI KHI TẢI HỒ SƠ BỆNH NHÂN (ID: ${id}):`, error);
        res.status(500).json({ 
            message: 'Đã xảy ra lỗi máy chủ khi truy xuất hồ sơ bệnh nhân.',
            error_details: error.message 
        });
    }
});

router.get('/edit/:id', async (req, res) => {
    const { id } = req.params;

    const patientQuery = `
        SELECT bn_ma, bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
        FROM benh_nhan
        WHERE bn_ma = $1;
    `;

    try {
        const result = await pool.query(patientQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).send('<h1>404 Not Found</h1><p>Không tìm thấy bệnh nhân để chỉnh sửa.</p>');
        }

        const patientData = result.rows[0];

        res.render('patient_edit', { 
            title: `Chỉnh Sửa Hồ Sơ: ${patientData.bn_ho_ten}`,
            patient: patientData
        });

    } catch (error) {
        console.error(`LỖI KHI TẢI HỒ SƠ CHỈNH SỬA (ID: ${id}):`, error);
        res.status(500).json({ 
            message: 'Đã xảy ra lỗi máy chủ khi tải form.',
            error_details: error.message 
        });
    }
});

router.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { ho_ten, sdt, gioi_tinh, ngay_sinh, dia_chi } = req.body; 

    const updateQuery = `
        UPDATE benh_nhan
        SET 
            bn_ho_ten = $1, 
            bn_sdt = $2, 
            bn_gioi_tinh = $3, 
            bn_ngay_sinh = $4, 
            bn_dia_chi = $5
        WHERE bn_ma = $6;
    `;

    try {
        await pool.query(updateQuery, [ho_ten, sdt, gioi_tinh, ngay_sinh, dia_chi, id]);

        res.redirect(`/api/patient_detail/${id}`); 

    } catch (error) {
        console.error(`❌ LỖI KHI CẬP NHẬT HỒ SƠ (ID: ${id}):`, error);
        res.status(500).render('patient_edit', {
            title: 'Lỗi Cập Nhật Hồ Sơ',
            patient: req.body,
            error: 'Lỗi cập nhật dữ liệu. Vui lòng kiểm tra thông tin.'
        });
    }
});

module.exports = router;