/**

@param {string} thongBao 
 */
function hienThiThongBaoThanhCong(thongBao) {
  if (thongBao) {
    const titleEl = document.getElementById("successModalTitle");
    if (titleEl) titleEl.innerText = thongBao;
  }
  const modalEl = document.getElementById("successModal");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } else {
    alert(thongBao || "Thành công!");
    window.location.reload();
  }
}

function danhSachBenhNhan() {
  window.location.href = "/api/patients";
}

function danhSachLichHen() {
  window.location.href = "/api/appointments";
}

function danhSachThuoc() {
  window.location.href = "/api/thuoc";
}
