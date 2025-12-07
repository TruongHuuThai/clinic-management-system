let danhSachNhomThuoc = [];
let danhSachDichVu = [];
let tatCaDonMau = [];
let danhSachBenhChon = [];

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
    new bootstrap.Modal(modalEl).show();
  } else {
    alert(noiDung.replace(/<[^>]*>?/gm, ""));
  }
}

function taiDanhSachDonMau() {
  const select = $("#selectDonMau");
  select.empty().append('<option value=""> Chọn đơn thuốc mẫu </option>');
  const mauCaNhan = JSON.parse(localStorage.getItem("userTemplates")) || [];
  tatCaDonMau = [...mauCaNhan];
  if (mauCaNhan.length > 0) {
    mauCaNhan.forEach((m) => {
      select.append(`<option value="${m.id}">${m.ten}</option>`);
    });
  }
}

function chonDonMau(selectElement) {
  const idChon = selectElement.value;
  if (!idChon) return;
  const donMau = tatCaDonMau.find((m) => m.id === idChon);
  if (!donMau) return;
  donMauDangChoXuLy = donMau;
  $("#lblTenDonMau").text(donMau.ten);
  const modalEl = document.getElementById("modalConfirmTemplate");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function thucHienApDungDonMau() {
  if (!donMauDangChoXuLy) return;
  $("#drugTable tbody").empty();
  if (donMauDangChoXuLy.thuoc && donMauDangChoXuLy.thuoc.length > 0) {
    donMauDangChoXuLy.thuoc.forEach((t) => themDongThuoc(t));
  } else {
    themDongThuoc();
  }
  danhSachBenhChon = [];
  if (donMauDangChoXuLy.benh && donMauDangChoXuLy.benh.length > 0) {
    donMauDangChoXuLy.benh.forEach((b) => {
      themBenhVaoDanhSach({
        id: b.id,
        label: b.ten,
        code: "",
      });
    });
  }
  renderTagsBenh(); 
  const modalEl = document.getElementById("modalConfirmTemplate");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
  donMauDangChoXuLy = null;
}

function huyApDungDonMau() {
  const modalEl = document.getElementById("modalConfirmTemplate");
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
  $("#selectDonMau").val("");
  donMauDangChoXuLy = null;
}

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
                lieu_dung: item.t_lieu_dung_mac_dinh,
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

      dongHienTai.find(".drug-dosage-input").val(ui.item.lieu_dung || "");
      dongHienTai.find(".drug-usage-input").val(ui.item.cach_dung || ""); 

      if (ui.item.nhom_thuoc) {
        dongHienTai.find(".drug-group-select").val(ui.item.nhom_thuoc);
      }
    },
  });
}

function themDongThuoc(data = null) {
  const idDong = taoIdNgauNhien();

  let htmlTuyChonNhom = '<option value=""> Chọn nhóm thuốc </option>';
  danhSachNhomThuoc.forEach((nhom) => {
    const maNhomData = data ? data.nhom || data.nhom_thuoc : null;
    const isSelected = maNhomData == nhom.nt_ma ? "selected" : "";
    htmlTuyChonNhom += `<option value="${nhom.nt_ma}" ${isSelected}>${nhom.nt_ten}</option>`;
  });

  const valTen = data ? data.t_ten_thuoc : "";
  const valMa = data ? data.t_ma : "";
  const valSL = data ? data.so_luong || data.ctdm_so_luong || 1 : 1;
  const valDonVi = data ? data.t_don_vi_tinh : "";

  const valLieuDung = data ? data.lieu_dung || data.ctdt_lieu_dung || data.t_lieu_dung_mac_dinh || "" : "";
  const valCachDung = data ? data.cach_dung || data.ctdt_cach_dung || data.t_cach_dung_mac_dinh || "" : "";

  const htmlDongMoi = `
        <tr class="drug-row" data-id="${idDong}">
            <td>
                <select name="nhom_thuoc[]" class="form-select drug-group-select">
                    ${htmlTuyChonNhom}
                </select>
            </td>
            <td>
                <input type="text" name="thuoc_ten[]" class="form-control drug-name-input" placeholder="Gõ tên thuốc" required autocomplete="off" value="${valTen}">
                <input type="hidden" name="thuoc_ma[]" class="drug-id-input" value="${valMa}">
            </td>
            <td>
                <input type="number" name="so_luong[]" class="form-control text-center drug-qty-input" value="${valSL}" min="1" required>
            </td>
            <td>
                <input type="text" name="don_vi[]" class="form-control drug-unit-input" readonly value="${valDonVi}">
            </td>
            <td>
                <input type="text" name="lieu_dung[]" class="form-control drug-dosage-input" placeholder="Sáng 1, Chiều 1,..." value="${valLieuDung}">
            </td>
            <td>
                <input type="text" name="cach_dung[]" class="form-control drug-usage-input" placeholder="Cách dùng..." value="${valCachDung}">
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

function themDongDichVu() {
  const idDong = taoIdNgauNhien();
  let optionsDV = '<option value=""> Chọn dịch vụ </option>';
  danhSachDichVu.forEach((s) => {
    optionsDV += `<option value="${s.dvcls_ma}" data-price="${
      s.cgdv_gia_ddich_vu || 0
    }">${s.dvcls_ten}</option>`;
  });
  const html = `
        <tr class="service-row" data-id="${idDong}">
            <td><select name="service_ma[]" class="form-select service-select" required>${optionsDV}</select></td>
            <td><input type="number" name="service_so_luong[]" class="form-control text-center service-qty" value="1" min="1" required></td>
            <td><input type="text" class="form-control text-end service-price" readonly placeholder="0"></td>
            <td class="text-center"><button type="button" class="btn btn-danger btn-sm remove-service"><i class="fas fa-trash"></i></button></td>
        </tr>
    `;
  $(html).appendTo("#serviceTableBody");
}

function khoiTaoTimKiemBenh() {
  $("#inputTimBenh").autocomplete({
    source: function (request, response) {
      $.ajax({
        url: "/api/benh/tim-kiem",
        dataType: "json",
        data: { q: request.term },
        success: function (data) {
          response(
            $.map(data, function (item) {
              return {
                label: `${item.b_ten} (${item.b_ma_icd || "N/A"})`,
                value: item.b_ten,
                id: item.b_ma,
                code: item.b_ma_icd,
              };
            })
          );
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      themBenhVaoDanhSach(ui.item);
      $(this).val("");
      return false;
    },
  });
}

function themBenhVaoDanhSach(item) {
  if (danhSachBenhChon.find((b) => b.id == item.id)) return;

  danhSachBenhChon.push({
    id: item.id,
    label: item.label || item.ten,
    code: item.code || "",
  });

  renderTagsBenh();
}

function xoaBenhKhoiDanhSach(id) {
  danhSachBenhChon = danhSachBenhChon.filter((b) => b.id != id);
  renderTagsBenh();
}

function renderTagsBenh() {
  const viewContainer = $("#danhSachBenhDaChon");
  const inputContainer = $("#containerInputBenh");

  viewContainer.empty();
  inputContainer.empty();

  if (danhSachBenhChon.length === 0) {
    viewContainer.html(
      '<span class="text-muted small fst-italic pt-1 ps-1">Chưa có bệnh nào được chọn...</span>'
    );
    return;
  }

  danhSachBenhChon.forEach((b) => {
    const tag = `
            <span class="badge bg-primary d-flex align-items-center p-2">
                <span class="me-2">${b.label}</span>
                <i class="fas fa-times cursor-pointer text-white-50 hover-text-white" onclick="xoaBenhKhoiDanhSach(${b.id})"></i>
            </span>
        `;
    viewContainer.append(tag);

    inputContainer.append(
      `<input type="hidden" name="ma_benh[]" value="${b.id}">`
    );
  });
}

$(document).ready(function () {
  Promise.all([
    fetch("/api/thuoc/nhom-thuoc").then((res) => res.json()),
    fetch("/api/dich-vu-cls/all").then((res) => res.json()),
  ])
    .then(([groups, services]) => {
      danhSachNhomThuoc = groups;
      danhSachDichVu = services;
      taiDanhSachDonMau();

      const dongThuocCu = $("#drugTable tbody tr");
      if (dongThuocCu.length === 0) {
        themDongThuoc();
      } else {
        let optNhom = '<option value=""> Chọn nhóm thuốc </option>';
        groups.forEach(
          (n) => (optNhom += `<option value="${n.nt_ma}">${n.nt_ten}</option>`)
        );
        dongThuocCu.each(function () {
          $(this).find(".drug-group-select").html(optNhom);
          khoiTaoGoiYThuoc($(this).find(".drug-name-input"));
        });
      }

      const dongDichVuCu = $("#serviceTableBody tr");
      if (dongDichVuCu.length > 0) {
        let optDV = '<option value="">-- Chọn dịch vụ --</option>';
        services.forEach(
          (s) =>
            (optDV += `<option value="${s.dvcls_ma}" data-price="${
              s.cgdv_gia_ddich_vu || 0
            }">${s.dvcls_ten}</option>`)
        );
        dongDichVuCu.find(".service-select").html(optDV);
      }
    })
    .catch((err) => console.error("Lỗi tải danh mục:", err));

  khoiTaoTimKiemBenh();

  $("#addDrugButton").click(() => themDongThuoc());
  $("#addServiceButton").click(themDongDichVu);

  $(document).on("click", ".remove-drug", function () {
    if ($("#drugTable tbody tr").length > 1) $(this).closest("tr").remove();
    else {
      $(this).closest("tr").find("input").val("");
      $(this).closest("tr").find("select").val("");
    }
  });

  $(document).on("click", ".remove-service", function () {
    const tr = $(this).closest("tr");
    if ($("#serviceTableBody tr").length > 1) tr.remove();
    else {
      tr.find("input").val("");
      tr.find("select").val("");
      tr.find(".service-qty").val(1);
    }
  });

  $(document).on("change", ".service-select", function () {
    const opt = $(this).find(":selected");
    const price = opt.data("price");
    const tr = $(this).closest("tr");
    if (price) tr.find(".service-price").val(dinhDangTien(price));
    else tr.find(".service-price").val("");

    const val = $(this).val();
    if (!val) return;
    let trung = false;
    $(".service-select")
      .not(this)
      .each(function () {
        if ($(this).val() == val) trung = true;
      });
    if (trung) {
      hienThiCanhBao(
        `Dịch vụ <strong>${opt.text().trim()}</strong> đã được chọn!`
      );
      $(this).val("");
      tr.find(".service-price").val("");
    }
  });
});

let urlHuyKhamTamThoi = "";

function xacNhanLuuPhieu() {
  // A. Validate dữ liệu
  const trieuChung = $("#pkb_trieu_chung").val().trim();
  const ketLuan = $("#dt_ghi_chu").val().trim();
  const daChonBenh = $("input[name='ma_benh[]']").length > 0;

  if (!trieuChung) {
    alert("Vui lòng nhập Triệu chứng/Lý do khám!"); // Có thể thay bằng Modal cảnh báo nếu muốn
    $("#pkb_trieu_chung").focus();
    return;
  }

  if (!daChonBenh) {
    alert("Vui lòng chọn ít nhất một Chẩn đoán bệnh (ICD-10)!");
    $("#inputTimBenh").focus();
    return;
  }

  if (!ketLuan) {
    alert("Vui lòng nhập Kết luận/Lời dặn của bác sĩ!");
    $("#dt_ghi_chu").focus();
    return;
  }

  const modalEl = document.getElementById("saveConfirmModal");
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  } else {
    if (confirm("Bạn có chắc chắn muốn lưu phiếu khám?")) thucHienLuuPhieu();
  }
}

function thucHienLuuPhieu() {
  const modalEl = document.getElementById("saveConfirmModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
  document.getElementById("phieuKhamBenhForm").submit();
}

function xacNhanHuyPhieu(urlRedirect) {
  urlHuyKhamTamThoi = urlRedirect;
  const modalEl = document.getElementById("cancelDataModal");
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  } else {
    if (confirm("Dữ liệu sẽ mất. Bạn chắc chắn muốn hủy?")) {
      window.location.href = urlRedirect;
    }
  }
}
