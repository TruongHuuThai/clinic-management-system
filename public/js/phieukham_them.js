// File: public/js/phieukham_them.js

// --- BIẾN TOÀN CỤC ---
let danhSachNhomThuoc = [];
let danhSachDichVu = [];

// --- HÀM TIỆN ÍCH ---
function taoIdNgauNhien() {
  return Math.random().toString(36).substring(2, 9);
}

function dinhDangTien(soTien) {
  return new Intl.NumberFormat("vi-VN").format(soTien);
}

function hienThiCanhBao(noiDung) {
  const modalEl = document.getElementById("warningModal");
  const msgEl = document.getElementById("warningMessage");

  if (modalEl && msgEl) {
    msgEl.innerHTML = noiDung;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } else {
    alert(noiDung.replace(/<[^>]*>?/gm, ""));
  }
}

// --- 1. XỬ LÝ THUỐC (DRUG) ---

function khoiTaoGoiYThuoc(element) {
  element.autocomplete({
    source: function (request, response) {
      const dongHienTai = element.closest("tr");
      const maNhomDangChon = dongHienTai.find(".drug-group-select").val();

      $.ajax({
        url: "/api/thuoc/tim-kiem",
        dataType: "json",
        data: {
          q: request.term,
          groupId: maNhomDangChon,
        },
        success: function (duLieu) {
          response(
            $.map(duLieu, function (item) {
              return {
                label: `${item.t_ten_thuoc} (${item.t_ham_luong || ""})`,
                value: item.t_ten_thuoc,
                id: item.t_ma,
                don_vi: item.t_don_vi_tinh,
                cach_dung: item.t_cach_dung_mac_dinh,
                huong_dan: item.t_huong_dan,
                nhom_thuoc: item.t_loai_thuoc,
              };
            })
          );
        },
        error: function (err) {
          console.error("Lỗi tìm thuốc:", err);
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      const dongHienTai = $(this).closest("tr");

      let biTrung = false;
      $(".drug-id-input")
        .not(dongHienTai.find(".drug-id-input"))
        .each(function () {
          if ($(this).val() == ui.item.id) {
            biTrung = true;
            return false;
          }
        });

      if (biTrung) {
        hienThiCanhBao(
          `Thuốc <strong>${ui.item.value}</strong> đã có trong đơn!`
        );
        $(this).val("");
        return false;
      }

      dongHienTai.find(".drug-id-input").val(ui.item.id);
      dongHienTai.find(".drug-unit-input").val(ui.item.don_vi || "");

      let noiDungCachDung = ui.item.cach_dung || "";
      if (ui.item.huong_dan)
        noiDungCachDung += (noiDungCachDung ? " - " : "") + ui.item.huong_dan;
      dongHienTai.find(".drug-usage-input").val(noiDungCachDung);

      if (!dongHienTai.find(".drug-group-select").val() && ui.item.nhom_thuoc) {
        dongHienTai.find(".drug-group-select").val(ui.item.nhom_thuoc);
      }
    },
  });
}

function themDongThuoc() {
  const idDong = taoIdNgauNhien();
  let htmlTuyChonNhom = '<option value="">-- Chọn nhóm --</option>';
  danhSachNhomThuoc.forEach((nhom) => {
    htmlTuyChonNhom += `<option value="${nhom.nt_ma}">${nhom.nt_ten}</option>`;
  });

  const htmlDongMoi = `
        <tr class="drug-row" data-id="${idDong}">
            <td>
                <select name="nhom_thuoc[]" class="form-select drug-group-select">
                    ${htmlTuyChonNhom}
                </select>
            </td>
            <td>
                <input type="text" name="thuoc_ten[]" class="form-control drug-name-input" placeholder="Gõ tên thuốc..." required autocomplete="off">
                <input type="hidden" name="thuoc_ma[]" class="drug-id-input">
            </td>
            <td>
                <input type="number" name="so_luong[]" class="form-control text-center drug-qty-input" value="1" min="1" required>
            </td>
            <td>
                <input type="text" name="don_vi[]" class="form-control drug-unit-input" readonly>
            </td>
            <td>
                <input type="text" name="cach_dung[]" class="form-control drug-usage-input" placeholder="Cách dùng...">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-danger btn-sm remove-drug">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;

  const dongMoi = $(htmlDongMoi).appendTo("#drugTable tbody");
  khoiTaoGoiYThuoc(dongMoi.find(".drug-name-input"));
}

// --- 2. XỬ LÝ DỊCH VỤ (SERVICE) ---

function themDongDichVu() {
  const idDong = taoIdNgauNhien();
  let htmlTuyChonDichVu = '<option value="">-- Chọn dịch vụ --</option>';
  danhSachDichVu.forEach((dv) => {
    htmlTuyChonDichVu += `<option value="${dv.dvcls_ma}" data-price="${
      dv.cgdv_gia_ddich_vu || 0
    }">
            ${dv.dvcls_ten}
        </option>`;
  });

  const htmlDongMoi = `
        <tr class="service-row" data-id="${idDong}">
            <td>
                <select name="service_ma[]" class="form-select service-select" required>
                    ${htmlTuyChonDichVu}
                </select>
            </td>
            <td>
                <input type="number" name="service_so_luong[]" class="form-control text-center service-qty" value="1" min="1" required>
            </td>
            <td>
                <input type="text" class="form-control text-end service-price" readonly placeholder="0">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-danger btn-sm remove-service">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;

  $(htmlDongMoi).appendTo("#serviceTableBody");
}

// --- 3. KHỞI TẠO VÀ SỰ KIỆN CHUNG ---

$(document).ready(function () {
  // Tải danh mục
  Promise.all([
    fetch("/api/thuoc/nhom-thuoc").then((res) => res.json()),
    fetch("/api/dich-vu-cls/all").then((res) => res.json()),
  ])
    .then(([nhomThuoc, dichVu]) => {
      danhSachNhomThuoc = nhomThuoc;
      danhSachDichVu = dichVu;

      // --- ĐIỀN DỮ LIỆU CHO CÁC DÒNG CÓ SẴN ---

      // 1. Thuốc
      const cacDongThuoc = $("#drugTable tbody tr");
      if (cacDongThuoc.length > 0) {
        let htmlTuyChonNhom = '<option value="">-- Chọn nhóm --</option>';
        danhSachNhomThuoc.forEach((nhom) => {
          htmlTuyChonNhom += `<option value="${nhom.nt_ma}">${nhom.nt_ten}</option>`;
        });
        cacDongThuoc.each(function () {
          const dong = $(this);
          dong.find(".drug-group-select").html(htmlTuyChonNhom);
          khoiTaoGoiYThuoc(dong.find(".drug-name-input"));
        });
      } else {
        themDongThuoc();
      }

      // 2. Dịch vụ
      const cacDongDichVu = $("#serviceTableBody tr");
      if (cacDongDichVu.length > 0) {
        let htmlTuyChonDichVu = '<option value="">-- Chọn dịch vụ --</option>';
        danhSachDichVu.forEach((dv) => {
          htmlTuyChonDichVu += `<option value="${dv.dvcls_ma}" data-price="${
            dv.cgdv_gia_ddich_vu || 0
          }">
                    ${dv.dvcls_ten}
                </option>`;
        });
        cacDongDichVu.find(".service-select").html(htmlTuyChonDichVu);
      }
    })
    .catch((err) => console.error("Lỗi tải danh mục:", err));

  // Nút Thêm
  $("#addDrugButton").click(themDongThuoc);
  $("#addServiceButton").click(themDongDichVu);

  // --- SỰ KIỆN XÓA THUỐC (QUAN TRỌNG: SỬA LẠI ĐỂ HOẠT ĐỘNG) ---
  $(document).on("click", ".remove-drug", function () {
    const tbody = $("#drugTable tbody");
    const dongHienTai = $(this).closest("tr");

    // Kiểm tra số lượng dòng
    if (tbody.children("tr").length > 1) {
      dongHienTai.remove(); // Xóa dòng
    } else {
      // Nếu là dòng cuối, chỉ xóa dữ liệu
      dongHienTai.find("input").val("");
      dongHienTai.find("select").val("");
      dongHienTai.find(".drug-qty-input").val(1);
    }
  });

  // --- SỰ KIỆN XÓA DỊCH VỤ ---
  $(document).on("click", ".remove-service", function () {
    const tbody = $("#serviceTableBody");
    const dongHienTai = $(this).closest("tr");

    if (tbody.children("tr").length > 1) {
      dongHienTai.remove();
    } else {
      dongHienTai.find("input").val("");
      dongHienTai.find("select").val("");
      dongHienTai.find(".service-qty").val(1);
    }
  });

  // Sự kiện chọn dịch vụ
  $(document).on("change", ".service-select", function () {
    const luaChon = $(this).find(":selected");
    const giaTien = luaChon.data("price");
    const oNhapGia = $(this).closest("tr").find(".service-price");

    if (giaTien) oNhapGia.val(dinhDangTien(giaTien));
    else oNhapGia.val("");

    const giaTriHienTai = $(this).val();
    if (!giaTriHienTai) return;

    let biTrung = false;
    $(".service-select")
      .not(this)
      .each(function () {
        if ($(this).val() == giaTriHienTai) {
          biTrung = true;
          return false;
        }
      });

    if (biTrung) {
      hienThiCanhBao(
        `Dịch vụ <strong>${luaChon.text().trim()}</strong> đã được chọn!`
      );
      $(this).val("");
      oNhapGia.val("");
    }
  });
});

/**
 * @param {string} urlDich 
 */
function xacNhanHuyPhieu(urlDich) {
    const modalEl = document.getElementById('cancelDataModal');
    const btnConfirm = document.getElementById('btnConfirmCancel');
    
    if (modalEl && btnConfirm) {
        btnConfirm.onclick = function() {
            window.location.href = urlDich; 
        };
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        if(confirm('Dữ liệu chưa lưu sẽ bị mất. Bạn có chắc chắn muốn hủy không?')) {
            window.location.href = urlDich;
        }
    }
}

function xacNhanLuuPhieu() {
  const form = document.getElementById("phieuKhamBenhForm");
  if (!form.checkValidity()) {
    form.reportValidity(); 
    return;
  }

  const modal = new bootstrap.Modal(
    document.getElementById("saveConfirmModal")
  );
  modal.show();
}

function thucHienLuuPhieu() {
  const modalEl = document.getElementById("saveConfirmModal");
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
  const form = document.getElementById("phieuKhamBenhForm");

  form.action = "/api/phieu-kham/save";
  form.submit();
}
