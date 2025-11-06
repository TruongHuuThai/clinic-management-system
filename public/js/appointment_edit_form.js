let globalOccupiedSlots = [];

function generateTimeSlotsHTML(currentSlotValue) {
    let html = '';
    const periods = [
        { start: 7, end: 11, label: "Sáng" },
        { start: 13, end: 20, label: "Chiều" }
    ];

    periods.forEach(period => {
        let current = period.start * 60;
        const end = period.end * 60;

        while (current <= end) {
            const hour = Math.floor(current / 60);
            const minute = current % 60;
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            const isOccupied = globalOccupiedSlots.includes(timeString);

            if (!isOccupied || timeString === currentSlotValue) {
                const isSelected = timeString === currentSlotValue ? 'selected' : '';
                html += `<option value="${timeString}" ${isSelected}>${timeString} (${period.label})</option>`;
            }

            current += 30;
        }
    });
    return html;
}

async function loadAvailableSlots(appointmentId, selectedSlot) {
    const appointmentDate = document.getElementById('ngay_hen').value;
    const selectElement = document.getElementById('khung_gio');

    if (!appointmentDate || !selectElement) return;

    try {
        const apiUrl = `/api/appointments/occupied_slots/${appointmentId}?date=${appointmentDate}`;
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error('Failed to fetch occupied slots');

        const result = await response.json();
        globalOccupiedSlots = result.occupiedSlots;

        selectElement.innerHTML = generateTimeSlotsHTML(selectedSlot);

    } catch (error) {
        console.error("Lỗi khi tải slot:", error);
        alert("Không thể kiểm tra khung giờ trống. Vui lòng thử lại.");
    }
}


function initializeFormLogic(appointmentId, currentSlot, initialSlots) {
    const form = document.getElementById('editAppointmentForm');
    const selectElement = document.getElementById('khung_gio');
    const dateInput = document.getElementById('ngay_hen');

    globalOccupiedSlots = initialSlots || [];

    if (selectElement && currentSlot) {
        selectElement.innerHTML = generateTimeSlotsHTML(currentSlot);
    } else {
        console.error("Lỗi: Không tìm thấy SELECT element hoặc currentSlot.");
    }

    // 3. Thêm Listener cho Form Submit
    if (form && appointmentId) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            saveAppointment(appointmentId);
        });
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {

            const selectedSlot = selectElement.value;
            loadAvailableSlots(appointmentId, selectedSlot);
        });
    }
}

async function saveAppointment(appointmentId) {
    const form = document.getElementById('editAppointmentForm');

    // 1. Lấy giá trị từ form (cũng là giá trị hiển thị DD/MM/YYYY)
    const ngayHenVN = form.querySelector('#ngay_hen').value;
    const khungGio = form.querySelector('#khung_gio').value;
    const trangThai = form.querySelector('#trang_thai').value;
    const ghiChu = form.querySelector('#ghi_chu').value;

    let ngayHenISO = ngayHenVN;

    // 2. BUỘC CHUYỂN ĐỔI NGÀY THÁNG (DD/MM/YYYY -> YYYY-MM-DD)
    if (ngayHenVN && ngayHenVN.includes('/')) {
        const parts = ngayHenVN.split('/');
        // Tạo chuỗi ISO: YYYY-MM-DD
        ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`; 
    }
    // Ghi chú: Nếu ngayHenVN đã là ISO (do Datepicker tự động), logic vẫn hoạt động an toàn.
    
    // 3. Chuẩn bị Dữ liệu Gửi
    const updatedData = {
        ngay_hen: ngayHenISO, // Gửi giá trị đã chuyển đổi (ISO)
        khung_gio: khungGio,
        trang_thai: trangThai,
        ghi_chu: ghiChu,
    };

    const apiUrl = `/api/appointments/${appointmentId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            // Ném lỗi chi tiết từ server
            throw new Error(errorResult.message || `Lỗi server HTTP: ${response.status}`);
        }

        alert("Lưu thay đổi thành công!");
        // Chuyển hướng về trang danh sách lịch hẹn sau khi cập nhật
        window.location.href = '/api/appointments'; 

    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu cập nhật:", error);
        // Hiển thị lỗi chung cho người dùng
        alert(`Lỗi kết nối hoặc server: ${error.message || 'Không thể lưu thay đổi.'}`);
    }
}



function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}
