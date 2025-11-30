let selectedPatientId = null;
let formMode = "new";
let globalOccupiedSlots = [];

function generateTimeSlotsHTML(selectedSlotValue = null) {
  let html = '<option value="">Chọn khung giờ</option>';
  const periods = [
    { start: 7, end: 11, label: "Sáng" },
    { start: 13, end: 20, label: "Chiều" },
  ];

  periods.forEach((period) => {
    let current = period.start * 60;
    const end = period.end * 60;

    while (current <= end) {
      const hour = Math.floor(current / 60);
      const minute = current % 60;
      const timeString = `${String(hour).padStart(2, "0")}:${String(
        minute
      ).padStart(2, "0")}`;

      const isOccupied = globalOccupiedSlots.includes(timeString);
      const isCurrent = timeString === selectedSlotValue;

      if (!isOccupied || isCurrent) {
        const isSelected = isCurrent ? "selected" : "";
        const occupiedTag = isOccupied && isCurrent ? " (Đã đặt)" : "";
        html += `<option value="${timeString}" ${isSelected}>${timeString} (${period.label})${occupiedTag}</option>`;
      }

      current += 30;
    }
  });

  if (html === '<option value="">Chọn khung giờ</option>') {
    return '<option value="" disabled selected>Không còn khung giờ trống</option>';
  }

  return html;
}

async function loadAvailableSlots(appointmentId, selectedSlot) {
  const dateInput = document.getElementById("ngay_hen");
  const selectElement = document.getElementById("khung_gio");

  if (!dateInput || !selectElement) return;

  let appointmentDateVN = dateInput.value;

  let appointmentDateISO = appointmentDateVN;
  if (appointmentDateVN.includes("/")) {
    const parts = appointmentDateVN.split("/");

    if (parts.length === 3) {
      appointmentDateISO = `${parts[2]}-${parts[1].padStart(
        2,
        "0"
      )}-${parts[0].padStart(2, "0")}`;
    }
  } else {
    appointmentDateISO = appointmentDateVN.substring(0, 10);
  }

  try {
    const appointmentIdSafe = appointmentId || 0;
    const apiUrl = `/api/appointments/occupied_slots/${appointmentIdSafe}?date=${appointmentDateISO}`;
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error("Failed to fetch occupied slots");

    const result = await response.json();
    globalOccupiedSlots = result.occupiedSlots;

    selectElement.innerHTML = generateTimeSlotsHTML(selectedSlot);
  } catch (error) {
    console.error("Lỗi khi tải slot:", error);
    alert("Không thể kiểm tra khung giờ trống. Vui lòng thử lại.");
    selectElement.innerHTML = '<option value="">Lỗi tải giờ</option>';
  }
}

function initializeAppointmentForm() {
  const dateInput = document.getElementById("ngay_hen");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayVN = `${day}/${month}/${year}`;
  dateInput.value = todayVN;

  $("#ngay_hen").datepicker({
    dateFormat: "dd/mm/yy",
    minDate: 0,
    changeMonth: true,
    changeYear: true,
    yearRange: "1940:2030",

    onSelect: function (dateText, inst) {
      loadAvailableSlots(0, null);
    },
  });
  loadAvailableSlots(0, null);
}

$(document).ready(function () {
  initializeAppointmentForm();
});

function convertDateToISO(dateString) {
  if (dateString && dateString.includes("/")) {
    const parts = dateString.split("/");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString;
}

function initializeDatepickers() {
  $(".datepicker-input").datepicker({
    dateFormat: "dd/mm/yy",
    changeMonth: true,
    changeYear: true,
    yearRange: "1940:2030",
    closeText: "Đóng",
    currentText: "Hôm nay",
  });
  $(".datepicker-input").each(function () {
    let $input = $(this);
    let isoValue = $input.val();

    if (isoValue && isoValue.includes("-")) {
      let parts = isoValue.split("-");
      let displayValue = parts[2] + "/" + parts[1] + "/" + parts[0];
      $input.val(displayValue);
    }
  });
}

window.showTab = function (tabName) {
  const newPatientFields = document.getElementById("new_patient_fields");
  const existingPatientFields = document.getElementById(
    "existing_patient_fields"
  );
  const bnMaInput = document.getElementById("bn_ma");
  const searchInput = document.getElementById("patient_search");

  formMode = tabName;

  newPatientFields.style.display = tabName === "new" ? "block" : "none";
  existingPatientFields.style.display =
    tabName === "existing" ? "block" : "none";

  searchInput.required = true;

  if (tabName === "new") {
    bnMaInput.value = "";
    selectedPatientId = null;
  }
};

window.submitNewAppointment = async function (event) {
  event.preventDefault();
  const form = document.getElementById("newAppointmentForm");
  const payload = {};

  new FormData(form).forEach((value, key) => {
    if (key === "ngay_hen" || key === "bn_ngay_sinh") {
      payload[key] = convertDateToISO(value);
    } else {
      payload[key] = value;
    }
  });

  const bnMaInput = document.getElementById("bn_ma");

  if (formMode === "new") {
    const selectedGender = document.querySelector(
      'input[name="bn_gioi_tinh_new"]:checked'
    );
    payload.bn_ma = "";
    payload.bn_gioi_tinh = selectedGender ? selectedGender.value : "Nam";

    if (!payload.bn_ho_ten || !payload.bn_sdt || !payload.bn_ngay_sinh) {
      alert("Vui lòng nhập đầy đủ Tên, SĐT và Ngày Sinh cho bệnh nhân mới.");
      return;
    }
  } else if (formMode === "existing") {
    payload.bn_ma = bnMaInput.value;
    delete payload.bn_ho_ten;
    delete payload.bn_sdt;
    delete payload.bn_gioi_tinh;
    delete payload.bn_ngay_sinh;
    delete payload.bn_dia_chi;

    if (!payload.bn_ma) {
      alert("Vui lòng tìm và chọn một bệnh nhân có sẵn từ danh sách gợi ý.");
      return;
    }
  } else {
    alert("Vui lòng chọn chế độ Thêm mới hoặc Bệnh nhân có sẵn.");
    return;
  }
  const apiUrl = "/api/appointments/new";
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage =
        result.message || `Lỗi server HTTP: ${response.status}`;
      document.getElementById("failure-message").textContent = errorMessage;
      $("#failureModal").modal("show");
      return;
    }

    $("#successModal").modal("show");

    setTimeout(() => {
      window.location.href = "/api/appointments";
    }, 1000);
    $("#successModal").off("hidden.bs.modal");
  } catch (error) {
    document.getElementById(
      "failure-message"
    ).textContent = `Lỗi kết nối: ${error.message}`;
    $("#failureModal").modal("show");
  }
};

function initializeNewAppointmentForm() {
  const searchInput = document.getElementById("patient_search");
  const bnMaInput = document.getElementById("bn_ma");
  const hoTenInput = document.getElementById("bn_ho_ten_available");
  const sdtAvailableInput = document.getElementById("bn_sdt_available");
  const gioiTinhInput = document.getElementById("bn_gioi_tinh_available");
  const ngaySinhInput = document.getElementById("bn_ngay_sinh_available");
  const diaChiInput = document.getElementById("bn_dia_chi_available");
  const selectTimeElement = document.getElementById("khung_gio");
  const newDetailsDiv = document.getElementById("new_patient_fields");

  initializeDatepickers();

  if (selectTimeElement) {
    selectTimeElement.innerHTML = generateTimeSlotsHTML();
  }

  if (typeof $(searchInput).autocomplete === "function") {
    $(searchInput).autocomplete({
      source: async (request, response) => {
        try {
          const res = await fetch(
            `/api/patients/search?q=${encodeURIComponent(request.term)}`
          );
          if (!res.ok) throw new Error("Lỗi mạng khi gọi API");
          const data = await res.json();
          response(
            data.map((patient) => ({
              label: `${patient.bn_ho_ten} (${patient.bn_sdt || "N/A"})`,
              value: patient.bn_ma,
              details: patient,
            }))
          );
        } catch (error) {
          console.error("Lỗi khi lấy gợi ý bệnh nhân:", error);
          response([]);
        }
      },
      minLength: 1,
      select: (event, ui) => {
        event.preventDefault();

        bnMaInput.value = ui.item.value;
        selectedPatientId = ui.item.value;
        hoTenInput.value = ui.item.details.bn_ho_ten;
        sdtAvailableInput.value = ui.item.details.bn_sdt || "";
        gioiTinhInput.value = ui.item.details.bn_gioi_tinh || "";
        diaChiInput.value = ui.item.details.bn_dia_chi || "";

        const dob = ui.item.details.bn_ngay_sinh;
        if (dob) {
          try {
            ngaySinhInput.value = new Date(dob).toLocaleDateString("vi-VN");
          } catch (e) {
            ngaySinhInput.value = dob;
          }
        } else {
          ngaySinhInput.value = "";
        }

        showTab("existing");
      },
      focus: (event, ui) => {
        event.preventDefault();
      },
    });
  } else {
    console.warn("jQuery UI Autocomplete chưa được tải.");
  }

  searchInput.addEventListener("input", () => {
    if (bnMaInput.value !== "" && searchInput.value !== hoTenInput.value) {
      bnMaInput.value = "";
      selectedPatientId = null;
      showTab("new");
    }

    if (formMode === "new" && searchInput.value.trim().length > 0) {
      newDetailsDiv.style.display = "block";
    } else if (formMode === "new") {
      newDetailsDiv.style.display = "none";
    }
  });

  showTab("new");
}

document.addEventListener("DOMContentLoaded", initializeNewAppointmentForm);

function danhSachBenhNhan() {
  window.location.href = "/api/patients";
}

function danhSachLichHen() {
  window.location.href = "/api/appointments";
}
