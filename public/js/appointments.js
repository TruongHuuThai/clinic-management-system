// public/js/dashboard.js
let appointmentIdToDelete = null;

function checkAppointment(appointmentId) {
    if (!appointmentId) {
        console.error("Lỗi: Không tìm thấy Mã Lịch Hẹn để sửa.");
        alert("Không thể chỉnh sửa. Mã lịch hẹn không hợp lệ.");
        return false;
    }
}

function suaLichHen(element) {
    const appointmentId = getAppointmentId(element);
    if (!appointmentId) {
        console.error("Thiếu ID lịch hẹn để chỉnh sửa.");
        return;
    }
    const editUrl = `/api/appointments/edit/${appointmentId}`;
    window.location.href = editUrl;
}

function getAppointmentId(element) {
    if (element && typeof element.getAttribute === 'function') {
        return element.getAttribute('data-id');
    }
    return element; 
}

function xoaLichHen(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    
    if (!appointmentId) {
        console.error("Lỗi: Không tìm thấy ID lịch hẹn để xóa.");
        alert("Không thể xóa lịch hẹn. Mã ID không hợp lệ.");
        return;
    }
    appointmentIdToDelete = appointmentId; 
    $('#deleteConfirmModal').modal('show');
}

async function confirmDeletion() {
    const appointmentId = appointmentIdToDelete;
    
    if (!appointmentId) return;
    $('#deleteConfirmModal').modal('hide'); 

    const apiUrl = `/api/appointments/${appointmentId}`;
    
    try {
        const response = await fetch(apiUrl, { 
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Mã lỗi HTTP: ${response.status}`);
        }
        window.location.reload(); 

    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu xóa:", error);
        alert(`Lỗi kết nối hoặc server: ${error.message || 'Không thể xóa lịch hẹn.'}`);
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

$(document).ready(function() {

    $("#dateFrom").datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true,
        yearRange: "1940:2030",
        minDate: null, 
        closeText: 'Đóng',
        currentText: 'Hôm nay',
    });

    $("#dateFrom").each(function() {
        let $input = $(this);
        let isoValue = $input.val(); 
        
        if (isoValue && isoValue.includes('-')) {
            let parts = isoValue.split('-');
            let displayValue = parts[2] + '/' + parts[1] + '/' + parts[0]; 
            $input.val(displayValue);
        }
    });

    $('#filterForm').off('submit').on('submit', function(e) {
        e.preventDefault(); 
        applyFilters();  
    });
});

function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}
