async function apDungBoLoc() {
  const oTimKiem = document.getElementById("search");
  const tuKhoa = oTimKiem.value.trim();

  const url = new URL(window.location.href);
  if (tuKhoa) {
    url.searchParams.set("search", tuKhoa);
  } else {
    url.searchParams.delete("search");
  }

  window.location.href = url.toString();
}

function xoaBoLoc() {
  const url = new URL(window.location.href);
  url.search = "";
  window.location.href = url.toString();
}

function hienLoi(idInput, noiDungLoi) {
    const input = document.getElementById(idInput);
    const feedback = input.nextElementSibling; 
    
    input.classList.add('is-invalid'); 
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = noiDungLoi; 
    }
    input.focus();
}

function xoaLoi(idInput) {
    const input = document.getElementById(idInput);
    input.classList.remove('is-invalid'); 
}

async function luuThongTinSua() {
    const maBenhNhan = document.getElementById('edit_bn_ma').value;
    
    const tenBenhNhan = document.getElementById('edit_bn_ho_ten').value.trim();
    const soDienThoai = document.getElementById('edit_bn_sdt').value.trim();
    const ngaySinh = document.getElementById('edit_bn_ngay_sinh').value.trim();
    const diaChi = document.getElementById('edit_bn_dia_chi').value.trim();
    const gioiTinh = document.querySelector('input[name="edit_bn_gioi_tinh"]:checked')?.value || 'Nam';

    xoaLoi('edit_bn_ho_ten');
    xoaLoi('edit_bn_sdt');
    xoaLoi('edit_bn_ngay_sinh');

    let coLoi = false;

    const regexSDT = /^(0)[0-9]{9}$/;
    const regexNgay = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const regexTen =
      /^[a-zA-Z\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵĐđ]+$/i;

    if (!tenBenhNhan || !regexTen.test(tenBenhNhan)) {
        hienLoi('edit_bn_ho_ten', 'Vui lòng nhập Họ và Tên!');
        coLoi = true;
    }

    if (!coLoi) {
        if (!regexSDT.test(soDienThoai)) {
            hienLoi('edit_bn_sdt', 'SĐT phải bắt đầu bằng 0 và đủ 10 số (VD: 0901234567)');
            coLoi = true;
        }
    }

    if (!coLoi && ngaySinh) {
        if (!regexNgay.test(ngaySinh)) {
            hienLoi('edit_bn_ngay_sinh', 'Định dạng sai! Vui lòng nhập: dd/mm/yyyy');
            coLoi = true;
        } else {
            const parts = ngaySinh.split('/');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            const dateObj = new Date(year, month - 1, day);

            if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
                hienLoi('edit_bn_ngay_sinh', 'Ngày không tồn tại (Ví dụ: 30/02)');
                coLoi = true;
            } else if (dateObj > new Date()) {
                hienLoi('edit_bn_ngay_sinh', 'Ngày sinh không được lớn hơn ngày hiện tại!');
                coLoi = true;
            } else if (year < 1900) {
                hienLoi('edit_bn_ngay_sinh', 'Năm sinh không hợp lệ!');
                coLoi = true;
            }
        }
    }

    if (coLoi) return;
    const duLieu = {
        ten_benh_nhan: tenBenhNhan,
        so_dien_thoai: soDienThoai,
        ngay_sinh: ngaySinh,
        dia_chi: diaChi,
        gioi_tinh: gioiTinh
    };

    try {
        const res = await fetch(`/api/benh-nhan/cap-nhat/${maBenhNhan}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duLieu)
        });

        const ketQua = await res.json();

        if (res.ok) {
            if (modalSuaInstance) modalSuaInstance.hide();
            hienThiThongBaoThanhCong("Cập nhật hồ sơ thành công!");
        } else {
            if (ketQua.message.includes("SDT")) {
                hienLoi('edit_bn_sdt', 'Số điện thoại này đã được sử dụng!');
            } else {
                alert("Lỗi: " + ketQua.message);
            }
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối server.");
    }
}

let maBenhNhanCanXoa = null;

function moModalXoaBenhNhan(id, ten) {
    maBenhNhanCanXoa = id;
    
    const tenEl = document.getElementById('deleteTargetName'); 
    if (tenEl) tenEl.innerText = ten;

    const modalXoa = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modalXoa.show();

    const btnXacNhan = document.getElementById('confirmDeleteButton');
    btnXacNhan.onclick = xacNhanXoaBenhNhan; 
}

async function xacNhanXoaBenhNhan() {
  if (!maBenhNhanCanXoa) return;

  const confirmModalEl = document.getElementById("deleteConfirmModal");
  const confirmModal = bootstrap.Modal.getInstance(confirmModalEl);
  confirmModal.hide();

  try {
    const res = await fetch(`/api/benh-nhan/xoa/${maBenhNhanCanXoa}`, {
      method: "DELETE",
    });
    const kq = await res.json();

    if (res.status === 409) {
      hienThiThongBaoVaTat(kq.message, 2000);
    } else if (res.ok) {
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Đã xóa bệnh nhân!");
      } else {
        window.location.reload();
      }
    } else {
      hienThiThongBaoVaTat("Lỗi: " + kq.message, 3000);
    }
  } catch (err) {
    console.error(err);
    hienThiThongBaoVaTat("Lỗi kết nối server.", 3000);
  }
}

let notificationTimeout = null;
let notifModalInstance = null; 

function hienThiThongBaoVaTat(thongBao, thoiGian) {
  clearTimeout(notificationTimeout); 

  const modalEl = document.getElementById("notificationModal");
  if (!modalEl) {
    alert(thongBao);
    return;
  }

  if (!notifModalInstance) {
    notifModalInstance = new bootstrap.Modal(modalEl, {
      keyboard: false,
      backdrop: false,
    });
  }

  document.getElementById("notificationMessage").innerText = thongBao;
  notifModalInstance.show();

  notificationTimeout = setTimeout(() => {
    notifModalInstance.hide();
  }, thoiGian);
}

function modalThemMoiBenhNhan() {

  document.getElementById("patientNewForm").reset();
  document.getElementById("new_bn_ho_ten").classList.remove("is-invalid");
  document.getElementById("new_bn_sdt").classList.remove("is-invalid");
  document.getElementById("new_bn_ngay_sinh").classList.remove("is-invalid");

  const modal = new bootstrap.Modal(document.getElementById("addPatientModal"));
  modal.show();
}

async function luuBenhNhanMoi() {
  const form = document.getElementById("patientNewForm");

  const tenBenhNhan = document.getElementById("new_bn_ho_ten").value.trim();
  const soDienThoai = document.getElementById("new_bn_sdt").value.trim();
  const ngaySinh = document.getElementById("new_bn_ngay_sinh").value.trim();
  const diaChi = document.getElementById("new_bn_dia_chi").value.trim();
  const gioiTinh =
    document.querySelector('input[name="gioi_tinh"]:checked')?.value || "Nam";
    
    xoaLoi("new_bn_ho_ten");
    xoaLoi("new_bn_sdt");
    xoaLoi("new_bn_ngay_sinh");

    let coLoi = false;
    const regexSDT = /^(0)[0-9]{9}$/;
    const regexNgay = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const regexTen =
      /^[a-zA-Z\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵĐđ]+$/i;

  if (!tenBenhNhan || !regexTen.test(tenBenhNhan)) {
    hienLoi("new_bn_ho_ten", "Vui lòng nhập họ tên hợp lệ");
    coLoi = true;
  }


  if (!coLoi || !regexSDT.test(soDienThoai2)) {
    if (!regexSDT.test(soDienThoai)) {
      hienLoi(
        "new_bn_sdt",
        "SĐT phải bắt đầu bằng 0 và đủ 10 số (VD: 0901234567)"
      );
      coLoi = true;
    }
  }

  if (!coLoi && ngaySinh) {

    if (!regexNgay.test(ngaySinh)) {
      hienLoi("new_bn_ngay_sinh", "Định dạng sai (dd/mm/yyyy).");
      coLoi = true;
    } else {
      const parts = ngaySinh.split("/");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const dateObj = new Date(year, month - 1, day);

      if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() + 1 !== month ||
        dateObj.getDate() !== day
      ) {
        hienLoi("new_bn_ngay_sinh", "Ngày sinh không tồn tại (VD: 30/02).");
        coLoi = true;
      } else if (dateObj > new Date()) {
        hienLoi("new_bn_ngay_sinh", "Ngày sinh không được ở tương lai.");
        coLoi = true;
      }
    }
  }

  if (coLoi) return;

  const ngaySinhISO = ngaySinh ? ngaySinh.split("/").reverse().join("-") : null;

  const duLieu = {
    ten_benh_nhan: tenBenhNhan,
    so_dien_thoai: soDienThoai,
    ngay_sinh: ngaySinhISO, 
    dia_chi: diaChi,
    gioi_tinh: gioiTinh,
  };

  try {
    const res = await fetch("/api/benh-nhan/them-moi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duLieu),
    });

    const ketQua = await res.json();

    if (res.ok) {
      bootstrap.Modal.getInstance(
        document.getElementById("addPatientModal")
      ).hide();

      const checkKhamNgay = document.getElementById("check_kham_ngay");
      const isKhamNgay = checkKhamNgay ? checkKhamNgay.checked : false;

      if (isKhamNgay && ketQua.bn_ma) {
        dangKyKhamNgay(ketQua.bn_ma, duLieu.ten_benh_nhan, true);
      } else {
        hienThiThongBaoThanhCong("Thêm bệnh nhân thành công!");
      }
    } else if (res.status === 409) {
      hienLoi("new_bn_sdt", "Số điện thoại này đã được sử dụng!");
    } else {
      alert("Lỗi: " + (ketQua.message || "Lỗi server."));
    }
  } catch (loi) {
    console.error(loi);
    alert("Lỗi kết nối server.");
  }
}

function khoiTaoRangBuocNhapLieu() {
  $("#new_bn_sdt").on("keypress", function (e) {
    const charCode = e.which;
    if (charCode < 48 || charCode > 57) {
      e.preventDefault();
    }
  });

  $("#new_bn_ngay_sinh").on("keypress", function (e) {
    const charCode = e.which;
    if (charCode !== 47 && (charCode < 48 || charCode > 57)) {
      e.preventDefault();
    }
  });

  $("#new_bn_ho_ten").on("keypress", function (e) {
    const charCode = e.which;
    if (
      charCode !== 32 &&
      charCode !== 8 &&
      charCode !== 9 &&
      !(charCode >= 65 && charCode <= 90) &&
      !(charCode >= 97 && charCode <= 122) &&
      charCode !== 0
    ) {
      e.preventDefault();
    }
  });
}

$(document).ready(function () {
  $("#search").autocomplete({
    source: function (request, response) {
      $.ajax({
        url: "/api/benh-nhan/tim-kiem",
        dataType: "json",
        data: {
          q: request.term,
        },
        success: function (data) {
          response(
            $.map(data, function (item) {
              return {
                label: `${item.bn_ho_ten} - ${item.bn_sdt}`,
                value: item.bn_ho_ten,
                id: item.bn_ma,
              };
            })
          );
        },
        error: function (err) {
          console.error("Loi tim kiem:", err);
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      $("#search").val(ui.item.value);
      apDungBoLoc();
      return false;
    },
  });

  khoiTaoRangBuocNhapLieu();

  $("#new_bn_ngay_sinh").datepicker({
    dateFormat: "dd/mm/yy",
    changeMonth: true,
    changeYear: true,
    yearRange: "1940:2025",
  });
});

async function dangKyKhamNgay(maBenhNhan, tenBenhNhan) {
  try {
    const res = await fetch("/api/lich-hen/tiep-don-ngay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maBenhNhan: maBenhNhan,
        ghiChu: "Khám bệnh vãng lai",
      }),
    });

    const kq = await res.json();

    if (res.ok) {
      window.location.href = `/api/phieu-kham/new/${kq.maLichHen}`;
    } else {
      alert("Lỗi: " + kq.message);
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server.");
  }
}

function themMoiBenhNhan() {
  window.location.href = "/api/benh-nhan/them-moi";
}

function chiTietBenhNhan(maBenhNhan) {
  window.location.href = `/api/benh-nhan/${maBenhNhan}`;
}
