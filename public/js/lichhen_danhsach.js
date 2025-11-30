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

  window.location.href = url.toString();
}

function danhSachLichHen() {
  window.location.href = "/api/lich-hen";
}

function themLichHen() {
  window.location.href = "/api/lich-hen/them-moi";
}

function suaLichHen(nutBam) {
  const maLichHen = nutBam.getAttribute("data-id");
  window.location.href = `/api/lich-hen/sua/${maLichHen}`;
}

let maLichHenCanXoa = null;

function xoaLichHen(nutBam) {
  maLichHenCanXoa = nutBam.getAttribute("data-id");
  const modalXoa = new bootstrap.Modal(
    document.getElementById("deleteConfirmModal")
  );
  modalXoa.show();
}

async function xacNhanXoa() {
  if (!maLichHenCanXoa) return;

  try {
    const phanHoi = await fetch(`/api/lich-hen/${maLichHenCanXoa}`, {
      method: "DELETE",
    });

    if (phanHoi.ok) {
      const modalXoaEl = document.getElementById("deleteConfirmModal");
      const modalInstance = bootstrap.Modal.getInstance(modalXoaEl);
      modalInstance.hide();

      const modalThanhCong = new bootstrap.Modal(
        document.getElementById("successModal")
      );
      modalThanhCong.show();
    } else {
      alert("Khong the xoa lich hen. Vui long thu lai.");
    }
  } catch (loi) {
    console.error(loi);
    alert("Loi ket noi server.");
  }
}

$(document).ready(function () {
  $(".datepicker-input").datepicker({
    dateFormat: "dd/mm/yy",
    changeMonth: true,
    changeYear: true,
  });
});
