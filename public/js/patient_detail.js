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
    
    if (html === '') {
        return '<option value="" disabled selected>Không còn khung giờ trống</option>';
    }
    
    return html;
}

async function loadAvailableSlots(selectedSlot) { 
    const date = document.getElementById('appointment_date').value;
    const slotSelect = document.getElementById('khung_gio');
    
    slotSelect.innerHTML = '<option value="" disabled selected>Đang tải...</option>';

    if (!date) {
        slotSelect.innerHTML = '<option value="" disabled selected>Chọn ngày trước</option>';
        return;
    }

    try {
        const appointmentId = 0; 
        const apiUrl = `/api/appointments/occupied_slots/${appointmentId}?date=${date}`; 
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error('Failed to fetch available slots');

        const result = await response.json();
        globalOccupiedSlots = result.occupiedSlots; 

        slotSelect.innerHTML = generateTimeSlotsHTML(selectedSlot);

    } catch (error) {
        console.error("Lỗi khi tải slot:", error);
        alert("Không thể kiểm tra khung giờ trống.");
        slotSelect.innerHTML = '<option value="" disabled selected>Lỗi tải khung giờ</option>';
    }
}

function showTaiKhamForm() {
    const container = document.getElementById('reschedule-form-container');
    const dateInput = document.getElementById('appointment_date');
    
    dateInput.valueAsDate = new Date();
    document.getElementById('form-message').textContent = '';
    container.style.display = 'block';

    const slotChangeListener = () => loadAvailableSlots(null);
    dateInput.removeEventListener('change', slotChangeListener);
    dateInput.addEventListener('change', slotChangeListener);
    
    loadAvailableSlots(null); 
}

async function submitTaiKham(patientId) {
    const date = document.getElementById('appointment_date').value;
    const note = document.getElementById('appointment_note').value;
    const slotSelect = document.getElementById('khung_gio');
    const timeSlot = slotSelect.value; 
    const messageEl = document.getElementById('form-message');

    if (!date || !timeSlot) {
        messageEl.textContent = 'Vui lòng chọn Ngày Hẹn và Khung Giờ.';
        messageEl.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: patientId,
                ngay_hen: date,
                ghi_chu: note,
                khung_gio: timeSlot,
                trang_thai: 'TAI_KHAM' 
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Đã tạo lịch tái khám thành công!';
            setTimeout(() => { window.location.reload(); }, 1000); 
        } else {
            messageEl.textContent = `Lỗi: ${result.message || 'Không thể tạo lịch hẹn.'}`;
            messageEl.style.color = 'red';
        }
        
    } catch (error) {
        messageEl.textContent = 'Lỗi kết nối máy chủ.';
        messageEl.style.color = 'red';
        console.error('Lỗi khi gửi lịch tái khám:', error);
    }
}

function hideTaiKhamForm() {
    document.getElementById('reschedule-form-container').style.display = 'none';
}

function suaLichHen(appointmentId) { 
    if (!appointmentId) {
        console.error("Thiếu ID lịch hẹn để chỉnh sửa.");
        alert("Không thể sửa lịch hẹn. Thiếu mã ID.");
        return;
    }
    window.location.href = `/api/appointments/edit/${appointmentId}`;
}

async function xoaLichHen(appointmentId) {
    if (!appointmentId) return;
    
    const isConfirmed = confirm("Có chắc chắn muốn xóa lịch hẹn này không?");
    if (!isConfirmed) return;
    
    const apiUrl = `/api/appointments/${appointmentId}`;

    try {
        const response = await fetch(apiUrl, { method: 'DELETE' });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Xóa không thành công. Chi tiết: ${errorText}.`);
        }

        alert("Xóa mềm lịch hẹn thành công!");
        window.location.reload();

    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu xóa:", error);
        alert(`Lỗi: ${error.message || 'Không thể xóa lịch hẹn.'}`);
    }
}

function danhSachBenhNhan(){ window.location.href = "/api/patients"; }
function danhSachLichHen(){ window.location.href = "/api/appointments"; }
function capNhatHoSoBenhNhan(bn_ma) { window.location.href = `/api/patients/edit/${bn_ma}`; }