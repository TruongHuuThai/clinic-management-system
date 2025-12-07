function apDungBoLoc() {
  const timKiem = document.getElementById("search").value;
  const trangThai = document.getElementById("status").value;
  const tuNgay = document.getElementById("dateFrom").value;

  const url = new URL(window.location.href);

  if (timKiem) url.searchParams.set("tim_kiem", timKiem);
  else url.searchParams.delete("tim_kiem");

  if (trangThai) url.searchParams.set("trang_thai", trangThai);
  else url.searchParams.delete("trang_thai");

  if (tuNgay) {
    const parts = tuNgay.split("/");
    if (parts.length === 3) {
      url.searchParams.set("tu_ngay", `${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  } else {
    url.searchParams.delete("tu_ngay");
  }

  url.searchParams.set("trang", 1);
  window.location.href = url.toString();
}

function chuyenTrang(soTrang) {
  const url = new URL(window.location.href);
  url.searchParams.set("trang", soTrang);
  window.location.href = url.toString();
}

function danhSachLichHen() {
  window.location.href = "/api/lich-hen";
}


function themLichHen() {
  document.getElementById("addAppointmentForm").reset();
  huyChonBenhNhan();

  document.getElementById("optionExisting").checked = true;
  chuyenTabBenhNhan("cu");

  const modal = new bootstrap.Modal(
    document.getElementById("addAppointmentModal")
  );
  modal.show();

  $("#add_lh_ngay").datepicker("destroy");
  $("#add_lh_ngay").datepicker({
    dateFormat: "dd/mm/yy",
    minDate: 0,
    onSelect: function (dateText) {
      loadAvailableSlotsForAdd(dateText);
    },
  });

  const inputTimKiem = $("#search_patient_input");
  if (inputTimKiem.data("ui-autocomplete")) {
    inputTimKiem.autocomplete("destroy");
  }
  inputTimKiem.autocomplete({
    source: function (request, response) {
      console.log("Đang tìm kiếm:", request.term);
      $.ajax({
        url: "/api/lich-hen/tim-kiem-benh-nhan",
        dataType: "json",
        data: { q: request.term },
        success: function (data) {
          console.log("Kết quả tìm kiếm:", data); 
          if (!data || data.length === 0) {
            response([
              { label: "Không tìm thấy bệnh nhân nào...", value: "", id: null },
            ]);
            return;
          }
          response(
            $.map(data, function (item) {
              return {
                label: `${item.bn_ho_ten} - ${item.bn_sdt}`,
                value: item.bn_ho_ten,
                id: item.bn_ma,
                sdt: item.bn_sdt,
                ngaysinh: item.bn_ngay_sinh,
              };
            })
          );
        },
        error: function (err) {
          console.error("Lỗi API tìm kiếm:", err);
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      if (ui.item.id) {
        chonBenhNhan(ui.item);
      }
      return false;
    },
  });
}

function chuyenTabBenhNhan(loai) {
  if (loai === "cu") {
    document.getElementById("tabBenhNhanCu").style.display = "block";
    document.getElementById("tabBenhNhanMoi").style.display = "none";

    document.getElementById("new_bn_ten").required = false;
    document.getElementById("new_bn_sdt").required = false;
  } else {
    document.getElementById("tabBenhNhanCu").style.display = "none";
    document.getElementById("tabBenhNhanMoi").style.display = "block";

    document.getElementById("new_bn_ten").required = true;
    document.getElementById("new_bn_sdt").required = true;

    $("#new_bn_ngaysinh").datepicker({
      dateFormat: "dd/mm/yy",
      changeYear: true,
      yearRange: "1900:2030",
    });
  }
}

function chonBenhNhan(item) {
  document.getElementById("add_bn_ma").value = item.id;
  document.getElementById("search_patient_input").value = "";

  document.getElementById("info_bn_ten").innerText = item.value;
  document.getElementById("info_bn_sdt").innerText = item.sdt || "N/A";

  document.getElementById("selectedPatientInfo").style.display = "block";
  document.getElementById("search_patient_input").style.display = "none";
}

function huyChonBenhNhan() {
  document.getElementById("add_bn_ma").value = "";
  document.getElementById("selectedPatientInfo").style.display = "none";
  document.getElementById("search_patient_input").style.display = "block";
  document.getElementById("search_patient_input").focus();
}

async function loadAvailableSlotsForAdd(dateText) {
  const selectEl = document.getElementById("add_lh_gio");
  selectEl.innerHTML = "<option>Đang tải...</option>";

  const parts = dateText.split("/");
  const dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const res = await fetch(`/api/lich-hen/khung-gio-ban/0?ngay=${dateISO}`);
    const data = await res.json();

    let html = '<option value=""> Chọn khung giờ </option>';
    const periods = [
      { s: 7, e: 11, l: "Sáng" },
      { s: 13, e: 17, l: "Chiều" },
    ];
    const busySlots = data.occupiedSlots || [];

    periods.forEach((p) => {
      let curr = p.s * 60;
      while (curr <= p.e * 60) {
        const h = Math.floor(curr / 60)
          .toString()
          .padStart(2, "0");
        const m = (curr % 60).toString().padStart(2, "0");
        const time = `${h}:${m}`;

        if (!busySlots.includes(time)) {
          html += `<option value="${time}">${time} (${p.l})</option>`;
        } else {
          html += `<option value="${time}" disabled class="bg-light text-muted">${time} (Đã kín)</option>`;
        }
        curr += 30;
      }
    });
    selectEl.innerHTML = html;
  } catch (e) {
    selectEl.innerHTML = "<option>Lỗi tải giờ</option>";
  }
}

async function luuLichHenMoi() {
  const isNewPatient = document.getElementById("optionNew").checked;
  const ngayHen = document.getElementById("add_lh_ngay").value;
  const khungGio = document.getElementById("add_lh_gio").value;
  const loaiHen = document.getElementById("add_lh_loai").value;
  const ghiChu = document.getElementById("add_lh_ghi_chu").value;

  if (!ngayHen || !khungGio) {
    alert("Vui lòng chọn ngày và giờ.");
    return;
  }

  const parts = ngayHen.split("/");
  const ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  const payload = {
    ngay_hen: ngayHenISO,
    khung_gio: khungGio,
    loai: loaiHen,
    ghi_chu: ghiChu,
    trang_thai: "CHO_KHAM",
  };

  if (isNewPatient) {
    payload.bn_ho_ten = document.getElementById("new_bn_ten").value;
    payload.bn_sdt = document.getElementById("new_bn_sdt").value;
    payload.bn_dia_chi = document.getElementById("new_bn_diachi").value;
    payload.bn_gioi_tinh = document.querySelector(
      'input[name="new_bn_gioitinh"]:checked'
    ).value;

    const dob = document.getElementById("new_bn_ngaysinh").value;
    if (dob) payload.bn_ngay_sinh = dob.split("/").reverse().join("-");
  } else {
    payload.bn_ma = document.getElementById("add_bn_ma").value;
    if (!payload.bn_ma) {
      alert("Vui lòng chọn bệnh nhân.");
      return;
    }
  }

  try {
    const res = await fetch("/api/lich-hen/them-moi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const kq = await res.json();
    if (res.ok) {
      bootstrap.Modal.getInstance(
        document.getElementById("addAppointmentModal")
      ).hide();
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Thêm lịch hẹn thành công!");
      } else {
        window.location.reload();
      }
    } else {
      alert("Lỗi: " + kq.message);
    }
  } catch (err) {
    alert("Lỗi kết nối.");
  }
}

async function moModalSuaLichHen(maLichHen) {
  try {
    document.getElementById("editAppointmentForm").reset();

    const res = await fetch(`/api/lich-hen/api/${maLichHen}`);
    if (!res.ok) throw new Error("Không tải được dữ liệu");

    const lh = await res.json();

    document.getElementById("edit_lh_ma").value = lh.lh_ma;
    document.getElementById("edit_bn_ten").value = lh.bn_ho_ten;
    document.getElementById("edit_lh_trang_thai").value = lh.lh_trang_thai;
    document.getElementById("edit_lh_ghi_chu").value = lh.lh_ghi_chu || "";

    if (document.getElementById("edit_lh_loai")) {
      document.getElementById("edit_lh_loai").value = lh.lh_loai || "MOI";
    }

    let dateStr = "";
    if (lh.lh_ngay_hen) {
      const d = new Date(lh.lh_ngay_hen);
      dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()}`;
      document.getElementById("edit_lh_ngay").value = dateStr;
    }

    const currentSlot = lh.lh_khung_gio
      ? lh.lh_khung_gio.substring(0, 5)
      : null;
    await loadAvailableSlotsForEdit(dateStr, currentSlot);

    const modal = new bootstrap.Modal(
      document.getElementById("editAppointmentModal")
    );
    modal.show();

    $("#edit_lh_ngay").datepicker("destroy");
    $("#edit_lh_ngay").datepicker({
      dateFormat: "dd/mm/yy",
      onSelect: function (dateText) {
        loadAvailableSlotsForEdit(dateText, null);
      },
    });
  } catch (err) {
    console.error(err);
    alert("Lỗi tải dữ liệu.");
  }
}

async function loadAvailableSlotsForEdit(dateText, currentSlot) {
  const selectEl = document.getElementById("edit_lh_gio");
  selectEl.innerHTML = "<option>Đang tải...</option>";

  if (!dateText) return;
  const parts = dateText.split("/");
  const dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const res = await fetch(`/api/lich-hen/khung-gio-ban/0?ngay=${dateISO}`);
    const data = await res.json();

    let html = '<option value=""> Chọn khung giờ </option>';
    const periods = [
      { s: 7, e: 11, l: "Sáng" },
      { s: 13, e: 17, l: "Chiều" },
    ];
    const busySlots = data.occupiedSlots || [];

    periods.forEach((p) => {
      let curr = p.s * 60;
      while (curr <= p.e * 60) {
        const h = Math.floor(curr / 60)
          .toString()
          .padStart(2, "0");
        const m = (curr % 60).toString().padStart(2, "0");
        const time = `${h}:${m}`;

        const isSelected = time === currentSlot ? "selected" : "";

        if (!busySlots.includes(time) || time === currentSlot) {
          html += `<option value="${time}" ${isSelected}>${time} (${p.l})</option>`;
        } else {
          html += `<option value="${time}" disabled class="bg-light text-muted">${time} (Đã kín)</option>`;
        }
        curr += 30;
      }
    });
    selectEl.innerHTML = html;
  } catch (e) {
    selectEl.innerHTML = "<option>Lỗi tải giờ</option>";
  }
}

async function luuCapNhatLichHen() {
  const maLichHen = document.getElementById("edit_lh_ma").value;
  const ngayHenVal = document.getElementById("edit_lh_ngay").value;
  const khungGio = document.getElementById("edit_lh_gio").value;
  const trangThai = document.getElementById("edit_lh_trang_thai").value;
  const ghiChu = document.getElementById("edit_lh_ghi_chu").value;
  const loai = document.getElementById("edit_lh_loai")
    ? document.getElementById("edit_lh_loai").value
    : "MOI";

  if (!ngayHenVal || !khungGio) {
    alert("Vui lòng chọn ngày và giờ.");
    return;
  }

  const parts = ngayHenVal.split("/");
  const ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const res = await fetch(`/api/lich-hen/${maLichHen}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ngay_hen: ngayHenISO,
        khung_gio: khungGio,
        trang_thai: trangThai,
        ghi_chu: ghiChu,
        loai: loai,
      }),
    });

    if (res.ok) {
      bootstrap.Modal.getInstance(
        document.getElementById("editAppointmentModal")
      ).hide();
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Cập nhật lịch hẹn thành công!");
      } else {
        window.location.reload();
      }
    } else {
      const kq = await res.json();
      alert("Lỗi: " + kq.message);
    }
  } catch (err) {
    alert("Lỗi kết nối.");
  }
}

let maLichHenXoa = null;

function moModalXoaLichHen(maLichHen) {
  maLichHenXoa = maLichHen;
  const modal = new bootstrap.Modal(
    document.getElementById("deleteAppointmentModal")
  );
  modal.show();

  const btnConfirm = document.getElementById("btnConfirmDeleteAppt");

  btnConfirm.onclick = null;

  btnConfirm.onclick = async function () {
    try {
      const res = await fetch(`/api/lich-hen/${maLichHenXoa}`, {
        method: "DELETE",
      });

      if (res.ok) {
        bootstrap.Modal.getInstance(
          document.getElementById("deleteAppointmentModal")
        ).hide();
        if (typeof hienThiThongBaoThanhCong === "function") {
          hienThiThongBaoThanhCong("Đã xóa lịch hẹn!");
        } else {
          window.location.reload();
        }
      } else {
        const data = await res.json();
        alert("Lỗi: " + (data.message || "Không thể xóa."));
      }
    } catch (err) {
      alert("Lỗi kết nối.");
    }
  };
}


$(document).ready(function () {
  $(".datepicker-input").datepicker({
    dateFormat: "dd/mm/yy",
    changeMonth: true,
    changeYear: true,
  });
});
