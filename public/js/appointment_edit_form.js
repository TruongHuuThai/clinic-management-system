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

    const updatedData = {
        ngay_hen: form.querySelector('#ngay_hen').value,
        khung_gio: form.querySelector('#khung_gio').value,
        trang_thai: form.querySelector('#trang_thai').value,
        ghi_chu: form.querySelector('#ghi_chu').value,
    };

    const apiUrl = `/api/appointments/${appointmentId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Lỗi server HTTP: ${response.status}`);
        }
        window.location.href = '/api/appointments';

    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu cập nhật:", error);
        alert(`Lỗi kết nối hoặc server: ${error.message || 'Không thể lưu thay đổi.'}`);
    }
}

function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}
