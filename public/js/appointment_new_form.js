// public/js/appointment_new_form.js


let selectedPatientId = null;
let formMode = 'new';

function generateTimeSlotsHTML(currentHour = '07:00') {
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

            // Đánh dấu slot hiện tại (nếu có)
            const isSelected = timeString === currentHour ? 'selected' : '';

            html += `<option value="${timeString}" ${isSelected}>${timeString} (${period.label})</option>`;
            current += 30;
        }
    });
    return html;
}

window.showTab = function (tabName) {
    const newPatientForm = document.getElementById('new_patient_fields');
    const existingPatientForm = document.getElementById('existing_patient_fields');
    const bnMaInput = document.getElementById('bn_ma');
    const searchInput = document.getElementById('patient_search');

    formMode = tabName;

    if (tabName === 'new') {
        bnMaInput.value = '';
        newPatientForm.style.display = 'block';
        existingPatientForm.style.display = 'none';
        searchInput.required = true;
    } else if (tabName === 'existing') {
        newPatientForm.style.display = 'none';
        existingPatientForm.style.display = 'block';
        searchInput.required = true;
    }
}

window.submitNewAppointment = async function (event) {
    event.preventDefault();
    const form = document.getElementById('newAppointmentForm');
    const payload = {};

    // 1. Thu thập thông tin LỊCH HẸN từ form chính
    new FormData(form).forEach((value, key) => {
        payload[key] = value;
    });

    // 2. Thu thập thông tin BỆNH NHÂN dựa trên mode (Lấy trực tiếp bằng ID)
    const searchInput = document.getElementById('patient_search');
    const bnMaInput = document.getElementById('bn_ma');

    if (formMode === 'new') {
        payload.bn_ma = '';
        payload.bn_ho_ten = searchInput.value;
        payload.bn_ho_ten = document.getElementById('bn_ho_ten_new').value;
        payload.bn_sdt = document.getElementById('bn_sdt_new').value;

        const selectedGender = document.querySelector('input[name="bn_gioi_tinh_new"]:checked');
        payload.bn_gioi_tinh = selectedGender ? selectedGender.value : 'Nam';

        payload.bn_ngay_sinh = document.getElementById('bn_ngay_sinh_new').value;
        payload.bn_dia_chi = document.getElementById('bn_dia_chi_new').value;

        if (!payload.bn_ho_ten || !payload.bn_sdt || !payload.bn_ngay_sinh) {
            alert("Vui lòng nhập đầy đủ Tên, Số Điện Thoại và Ngày Sinh cho bệnh nhân mới.");
            return;
        }
    } else if (formMode === 'existing') {
        payload.bn_ma = bnMaInput.value;
        payload.bn_ho_ten = searchInput.value;
        payload.bn_sdt = document.getElementById('bn_sdt_available').value;

        if (!payload.bn_ma) {
            alert("Vui lòng tìm và chọn một bệnh nhân có sẵn từ danh sách gợi ý.");
            return;
        }
    }

    const apiUrl = '/api/appointments/new';
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Lỗi server HTTP: ${response.status}`);
        }

        alert("Tạo lịch hẹn thành công!");
        window.location.href = '/api/appointments'; // Chuyển hướng về danh sách

    } catch (error) {
        console.error("LỖI KHI TẠO LỊCH HẸN:", error);
        alert(`Thao tác thất bại: ${error.message}`);
    }
}

// HÀM KHỞI TẠO CHÍNH 
function initializeNewAppointmentForm() {
    const searchInput = document.getElementById('patient_search');
    const bnMaInput = document.getElementById('bn_ma');
    const newDetailsDiv = document.getElementById('new_patient_fields');
    const existingDetailsDiv = document.getElementById('existing_patient_fields');
    const hoTenInput = document.getElementById('bn_ho_ten_available');
    const sdtAvailableInput = document.getElementById('bn_sdt_available');
    const selectTimeElement = document.getElementById('khung_gio');
    const gioiTinhInput = document.getElementById('bn_gioi_tinh_available');
    const ngaySinhInput = document.getElementById('bn_ngay_sinh_available');
    const diaChiInput = document.getElementById('bn_dia_chi_available');

    if (selectTimeElement) {
        selectTimeElement.innerHTML = generateTimeSlotsHTML();
    }

    // --- KHỞI TẠO JQUERY UI AUTOCOMPLETE ---
    if (typeof $(searchInput).autocomplete === 'function') {
        $(searchInput).autocomplete({
            source: async (request, response) => {
                try {
                    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(request.term)}`);
                    if (!res.ok) throw new Error('Lỗi mạng khi gọi API');
                    const data = await res.json();
                    response(data.map(patient => ({
                        label: `${patient.bn_ho_ten} (${patient.bn_sdt || 'N/A'})`,
                        value: patient.bn_ma,
                        details: patient
                    })));
                } catch (error) {
                    console.error("Lỗi khi lấy gợi ý bệnh nhân:", error);
                    response([]);
                }
            },
            minLength: 2,
            select: (event, ui) => {
                event.preventDefault();

                // Điền tên bệnh nhân gợi ý vào ô

                //searchInput.value = ui.item.details.bn_ho_ten;

                hoTenInput.value = ui.item.details.bn_ho_ten;

                // Gán id vào đường dẫn
                bnMaInput.value = ui.item.value;
                selectedPatientId = ui.item.value;

                // Điền số điện thoại
                if (sdtAvailableInput) {
                    sdtAvailableInput.value = ui.item.details.bn_sdt || '';
                }
                if (gioiTinhInput) {
                    // Giả sử bn_gioi_tinh là 'Nam' hoặc 'Nữ'
                    gioiTinhInput.value = ui.item.details.bn_gioi_tinh || '';
                }
                if (ngaySinhInput) {
                    // Định dạng lại ngày sinh nếu cần (ví dụ: từ ISO sang DD/MM/YYYY)
                    const dob = ui.item.details.bn_ngay_sinh;
                    if (dob) {
                        try {
                            // Thử định dạng ngày tháng
                            ngaySinhInput.value = new Date(dob).toLocaleDateString('vi-VN');
                        } catch (e) {
                            ngaySinhInput.value = dob; // Nếu không phải Date, hiển thị nguyên bản
                        }
                    } else {
                        ngaySinhInput.value = '';
                    }
                }
                if (diaChiInput) {
                    diaChiInput.value = ui.item.details.bn_dia_chi || '';
                }
                showTab('existing'); // Chuyển sang tab existing
            },
            focus: (event, ui) => {
                event.preventDefault();
            }
        });
    } else {
        console.warn("jQuery UI Autocomplete chưa được tải."); // Cảnh báo nếu thư viện thiếu
    }


    // --- LOGIC THEO DÕI INPUT ---
    searchInput.addEventListener('input', () => {
        // Kiểm tra xem jQuery đã tải chưa trước khi dùng $
        if (typeof $ !== 'undefined' && bnMaInput.value !== '' && searchInput.value !== $(searchInput).val()) {
            bnMaInput.value = '';
            selectedPatientId = null;
            showTab('new');
        } else if (bnMaInput.value !== '' && searchInput.value !== searchInput.value) { // Fallback nếu không có jQuery
            bnMaInput.value = '';
            selectedPatientId = null;
            showTab('new');
        }

        if (formMode === 'new' && searchInput.value.trim().length > 0) {
            newDetailsDiv.style.display = 'block';
        } else if (formMode === 'new') {
            newDetailsDiv.style.display = 'none';
        }
    });

    // Khởi tạo trạng thái tab ban đầu
    showTab('new');
}

// Gọi hàm khởi tạo khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', initializeNewAppointmentForm);