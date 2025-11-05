const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/appointments', async (req, res) => {
    const { search, status, dateFrom } = req.query; 
    let appointments = [];
    let totalCount = 0;
    
    try {
        let whereClauses = ["lh.lh_da_xoa = FALSE"]; 
        let queryParams = [];
        
        if (search) {
            queryParams.push(`%${search}%`);
            whereClauses.push(`(bn.bn_ho_ten ILIKE $${queryParams.length} OR bn.bn_sdt ILIKE $${queryParams.length})`);
        }
        
        if (status) {
            queryParams.push(status);
            whereClauses.push(`lh.lh_trang_thai = $${queryParams.length}`);
        }
        
        if (dateFrom) {
            queryParams.push(dateFrom);
            whereClauses.push(`lh.lh_ngay_hen >= $${queryParams.length}`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT 
                lh.lh_ma, lh.lh_khung_gio AS time, lh.lh_ngay_hen AS date, 
                bn.bn_ho_ten AS name, lh.lh_trang_thai AS status, lh.lh_ghi_chu AS note,
                bn.bn_sdt -- Lấy SĐT để tìm kiếm có sẵn
            FROM 
                lich_hen lh
            JOIN 
                benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma
            ${whereString}
            ORDER BY
                lh.lh_ngay_hen DESC, lh.lh_khung_gio DESC;
        `;

        const result = await pool.query(query, queryParams); 
        
        appointments = result.rows.map(row => ({
            ...row,
            status: row.status.replace(/_/g, ' ')
        }));
        totalCount = result.rowCount;

    } catch (error) {
        console.error('LỖI KHI TRUY VẤN LỊCH HẸN CHI TIẾT:', error);
            appointments = [];
                
              
            return res.status(500).render('appointments', { 
            title: 'Lỗi', 
            data: { appointments: [], totalCount: 0 },
            query: req.query || {}
        });
    }

    res.render('appointments', {
        title: 'Quản Lý Lịch Hẹn',
        data: {
            appointments: appointments,
            totalCount: totalCount
        },
        query: req.query
    });
});

router.get('/appointments/edit/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const currentAppointmentQuery = `
            SELECT lh.*, bn.bn_ho_ten 
            FROM lich_hen lh  
            JOIN benh_nhan bn ON lh.lh_ma_bn = bn.bn_ma 
            WHERE lh.lh_ma = $1; 
        `;
        const result = await pool.query(currentAppointmentQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).render('error', { title: '404', message: 'Không tìm thấy lịch hẹn cần sửa.' });
        }
        const appointmentData = result.rows[0];

        const appointmentDate = appointmentData.lh_ngay_hen.toISOString().substring(0, 10);

        const occupiedSlotsQuery = `
            SELECT lh_khung_gio 
            FROM lich_hen 
            WHERE 
                lh_ngay_hen = $1 
                AND lh_ma != $2 
                AND lh_trang_thai != 'DA_HUY' AND lh_trang_thai != 'DA_KHAM'; 
        `;

        const occupiedResult = await pool.query(occupiedSlotsQuery, [appointmentDate, id]);

        const occupiedSlots = occupiedResult.rows.map(row =>
            row.lh_khung_gio ? row.lh_khung_gio.substring(0, 5) : null
        ).filter(slot => slot);

        res.render('appointment_edit_form', {
            title: `Sửa Lịch Hẹn #${id}`,
            appointmentData: appointmentData,
            occupiedSlots: occupiedSlots
        });

    } catch (error) {
        console.error('LỖI KHI TẢI DỮ LIỆU SỬA:', error);
        res.status(500).send('Lỗi máy chủ khi tải dữ liệu.');
    }
});

router.put('/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { ngay_hen, khung_gio, trang_thai, ghi_chu } = req.body;

    if (!ngay_hen || !khung_gio || !trang_thai) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (Ngày, Giờ, Trạng thái).' });
    }

    try {
        const query = `
            UPDATE lich_hen 
            SET 
                lh_ngay_hen = $1, 
                lh_khung_gio = $2, 
                lh_trang_thai = $3, 
                lh_ghi_chu = $4
            WHERE 
                lh_ma = $5
            RETURNING *;
        `;
        const result = await pool.query(query, [ngay_hen, khung_gio, trang_thai, ghi_chu, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn để cập nhật.' });
        }

        res.status(200).json({ message: 'Cập nhật lịch hẹn thành công', updatedAppointment: result.rows[0] });

    } catch (error) {
        console.error('LỖI CSDL KHI CẬP NHẬT LỊCH HẸN:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi cập nhật dữ liệu.' });
    }
});

router.post('/appointment/:id/status', async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body;

    if (!newStatus || newStatus !== 'DA DEN') {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }
});

router.get('/appointments/occupied_slots/:id', async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: 'Thiếu   số ngày.' });
    }

    try {
        const query = `
            SELECT lh_khung_gio 
            FROM lich_hen 
            WHERE 
                lh_ngay_hen = $1 
                AND lh_ma != $2 
                AND lh_trang_thai != 'DA_HUY' AND lh_trang_thai != 'DA_KHAM'
                AND lh_da_xoa = false;
        `;

        const result = await pool.query(query, [date, id]);

        const occupiedSlots = result.rows.map(row =>
            row.lh_khung_gio ? row.lh_khung_gio.substring(0, 5) : null
        ).filter(slot => slot);

        res.status(200).json({ occupiedSlots });

    } catch (error) {
        console.error('LỖI API LẤY SLOT:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy khung giờ.' });
    }
});

router.delete('/appointments/:id', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        const sql = `
            UPDATE lich_hen
            SET lh_da_xoa = TRUE
            WHERE lh_ma = $1
            RETURNING *;
        `;

        const result = await pool.query(sql, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Lịch hẹn không tồn tại.' });
        }

        res.status(200).json({
            message: 'Đã xóa mềm lịch hẹn thành công.'
        });

    } catch (error) {
        console.error("Lỗi server khi xóa mềm lịch hẹn:", error);
        res.status(500).json({ message: 'Lỗi server nội bộ.' });
    }
});

router.get('/appointments/new', async (req, res) => {

    res.render('appointment_new_form', {
        title: 'Thêm Lịch Hẹn Mới',
        initialData: {
            todayDate: new Date().toISOString().substring(0, 10)
        }
    });
});

router.get('/patients/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const searchSql = `
            SELECT bn_ma, bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
            FROM benh_nhan
            WHERE bn_ho_ten ILIKE $1 OR bn_sdt ILIKE $1
            LIMIT 10;
        `;
        const result = await pool.query(searchSql, [`%${query}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error("LỖI TÌM KIẾM BN:", error);
        res.status(500).json([]);
    }
});

router.post('/appointments/new', async (req, res) => {

    const {
        ngay_hen, khung_gio, trang_thai, ghi_chu,
        bn_ma, bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
    } = req.body;

    let patientIdToUse;
    let client;

    if (!ngay_hen || !khung_gio) {
        return res.status(400).json({ message: 'Thiếu Ngày hoặc Khung giờ.' });
    }

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        if (!bn_ma) {
            if (!bn_ho_ten || !bn_sdt || !bn_ngay_sinh) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Thiếu Tên, SĐT hoặc Ngày Sinh Bệnh nhân mới.' });
            }

            const newPatientQuery = `
                INSERT INTO benh_nhan (bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING bn_ma;
            `;
            const result = await client.query(newPatientQuery, [
                bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
            ]);
            patientIdToUse = result.rows[0].bn_ma;

        }

        else {
            patientIdToUse = bn_ma;
        }

        const newAppointmentQuery = `
            INSERT INTO lich_hen (lh_ma_bn, lh_ngay_hen, lh_khung_gio, lh_trang_thai, lh_ghi_chu)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const appointmentResult = await client.query(newAppointmentQuery, [
            patientIdToUse, ngay_hen, khung_gio, trang_thai || 'CHO_KHAM', ghi_chu
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Tạo lịch hẹn thành công.',
            appointment: appointmentResult.rows[0]
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("LỖI KHI TẠO LỊCH HẸN:", error);
        res.status(500).json({ message: 'Lỗi server nội bộ khi tạo lịch hẹn.' });
    } finally {
        if (client) client.release();
    }
});

router.get('/patients', async (req, res) => {
    try {
        const patientsQuery = `
            SELECT 
                bn_ma, 
                bn_ho_ten, 
                bn_sdt,
                bn_dia_chi
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

router.get('/patients/:id', async (req, res) => {
    const { id } = req.params;
    
    const patientQuery = `
        SELECT bn_ho_ten, bn_sdt, bn_gioi_tinh, bn_ngay_sinh, bn_dia_chi
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
            const formattedDate = row.lh_ngay_hen 
                ? new Date(row.lh_ngay_hen).toLocaleDateString('vi-VN')
                : 'Chưa có ngày';

            const formattedStatus = row.lh_trang_thai 
                ? row.lh_trang_thai.replace(/_/g, ' ') 
                : 'Không xác định';

            return {
                ...row,
                lh_ngay_hen: formattedDate,
                lh_trang_thai: formattedStatus
            };
        });

        res.render('patient_list', {
            title: `Hồ sơ Bệnh nhân: ${patientData.bn_ho_ten}`,
            patients: patientData,
            history: appointmentsHistory
        });

    } catch (error) {
        console.error(`LỖI GỐC KHI TẢI HỒ SƠ BỆNH NHÂN (ID: ${id}):`, error);
        
        res.status(500).json({ 
            message: 'Đã xảy ra lỗi máy chủ khi truy xuất hồ sơ bệnh nhân.',
            error_details: error.message 
        });
    }
});

module.exports = router;