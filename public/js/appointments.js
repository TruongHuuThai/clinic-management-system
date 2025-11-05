// public/js/dashboard.js
function checkAppointment(appointmentId) {
    if (!appointmentId) {
        console.error("Lỗi: Không tìm thấy Mã Lịch Hẹn để sửa.");
        alert("Không thể chỉnh sửa. Mã lịch hẹn không hợp lệ.");
        return false;
    }
}

function suaLichHen(buttonElement) {

    const appointmentId = buttonElement.getAttribute('data-id');

    checkAppointment(appointmentId);

    const editUrl = `/api/appointments/edit/${appointmentId}`;
    console.log("URL CHUYỂN HƯỚNG:", editUrl);

    console.log(`Chuyển hướng đến trang sửa lịch hẹn ID: ${appointmentId}`);
    window.location.href = editUrl;
}

async function xoaLichHen(buttonElement) {

    const appointmentId = buttonElement.getAttribute('data-id');

    if (!appointmentId) {
        console.error("Lỗi: Không tìm thấy ID lịch hẹn để xóa.");
        return;
    }

    const isConfirmed = confirm("Có chắc chắn muốn xóa lịch hẹn này không?");

    if (!isConfirmed) {
        return;
    }

    const apiUrl = `/api/appointments/${appointmentId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Lỗi HTTP Status:", response.status, "Chi tiết:", errorText);
            throw new Error(`Xóa không thành công. Mã lỗi ${response.status}.`);
        }

        alert("Xóa mềm lịch hẹn thành công!");
        window.location.reload();

    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu xóa:", error);
        alert(`Lỗi: ${error.message || 'Không thể xóa lịch hẹn.'}`);
    }
}

function themLichHen() {
    window.location.href = '/api/appointments/new';
}

function applyFilters() {
    const form = document.getElementById('filterForm');
    const search = form.elements.search.value;
    const status = form.elements.status.value;
    const dateFrom = form.elements.dateFrom.value;
        
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
        
    window.location.href = '/api/appointments?' + params.toString();
}

function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}
