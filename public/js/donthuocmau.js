const STORAGE_KEY = "userTemplates";
let danhSachNhomThuoc = [];
let danhSachBenhDangChon = [];

$(document).ready(function () {
  fetch("/api/thuoc/nhom-thuoc")
    .then((res) => res.json())
    .then((data) => {
      danhSachNhomThuoc = data;
      renderDanhSach();
    })
    .catch((err) => console.error(err));

  khoiTaoTimBenh();

  $("#btnAddDrugRow").click(() => themDongThuocHTML());

  $(document).on("click", ".remove-drug", function () {
    $(this).closest("tr").remove();
  });
});

function khoiTaoTimBenh() {
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
                label: item.b_ten,
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
      themBenhVaoList(ui.item);
      $(this).val("");
      return false;
    },
  });
}

function themBenhVaoList(item) {
  if (danhSachBenhDangChon.find((b) => b.id === item.id)) return;
  danhSachBenhDangChon.push({ id: item.id, ten: item.label });
  renderTagsBenh();
}

function xoaBenhKhoiList(id) {
  danhSachBenhDangChon = danhSachBenhDangChon.filter((b) => b.id !== id);
  renderTagsBenh();
}

function renderTagsBenh() {
  const container = $("#danhSachBenhTags");
  container.empty();
  danhSachBenhDangChon.forEach((b) => {
    const tag = `
            <span class="badge bg-primary p-2">
                ${b.ten}
                <i class="fas fa-times ms-2" style="cursor:pointer" onclick="xoaBenhKhoiList(${b.id})"></i>
            </span>
        `;
    container.append(tag);
  });
}

function renderDanhSach() {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const tbody = $("#templateTableBody");
  tbody.empty();

  if (list.length === 0) {
    $("#empty-state").removeClass("d-none");
    tbody.closest(".card").addClass("d-none"); 
    return;
  }
  $("#empty-state").addClass("d-none");
  tbody.closest(".card").removeClass("d-none");

  list.forEach((mau, index) => {
    let tomTatThuoc = '<div class="drug-list-container">';

    if (mau.thuoc && mau.thuoc.length > 0) {
      mau.thuoc.forEach((t) => {
        tomTatThuoc += `
                    <div class="drug-item-row">
                        <span class="fw-bold text-dark">${t.t_ten_thuoc}</span> 
                        <small class="text-muted ms-1">
                            (SL: <span class="text-danger fw-bold">${t.so_luong}</span>)
                        </small>
                    </div>`;
      });
    } else {
      tomTatThuoc +=
        '<span class="text-muted small fst-italic">Không có thuốc</span>';
    }
    tomTatThuoc += "</div>";

    let tomTatBenh = '<span class="text-muted small">Chưa gắn bệnh</span>';
    if (mau.benh && mau.benh.length > 0) {
      tomTatBenh = mau.benh
        .map((b) => {
          const label = b.code ? `${b.ten}` : b.ten;
          return `<span class="benh-badge border">${label}</span>`; 
        })
        .join(" ");
    }
    const tr = `
            <tr>
                <td class="text-center fw-bold">${index + 1}</td>
                <td class="fw-bold text-primary">${mau.ten}</td>
                <td>${tomTatBenh}</td>
                <td>${tomTatThuoc}</td>
                <td class="text-center">
                    <button class="btn-action btn-edit" onclick="suaDonMau('${
                      mau.id
                    }')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="xoaDonMau('${
                      mau.id
                    }')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    tbody.append(tr);
  });
}
function moModalThemDonMau() {
  document.getElementById("templateForm").reset();
  document.getElementById("templateId").value = "";
  document.getElementById("modalTitle").innerText = "Tạo Đơn Thuốc Mẫu Mới";

  danhSachBenhDangChon = [];
  renderTagsBenh();

  $("#drugTable tbody").empty();
  themDongThuocHTML();
  new bootstrap.Modal(document.getElementById("templateModal")).show();
}

function suaDonMau(id) {
  const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const mau = list.find((m) => m.id === id);
  if (!mau) return;

  document.getElementById("templateId").value = mau.id;
  document.getElementById("templateName").value = mau.ten;
  document.getElementById("modalTitle").innerText = "Chỉnh Sửa Đơn Mẫu";

  danhSachBenhDangChon = mau.benh || [];
  renderTagsBenh();

  const tbody = $("#drugTable tbody");
  tbody.empty();

  if (mau.thuoc && mau.thuoc.length > 0) {
    mau.thuoc.forEach((t) => themDongThuocHTML(t));
  } else {
    themDongThuocHTML();
  }

  new bootstrap.Modal(document.getElementById("templateModal")).show();
}

function luuDonMau() {
  const id = document.getElementById("templateId").value;
  const ten = document.getElementById("templateName").value.trim();

  if (!ten) {
    alert("Vui lòng nhập tên đơn mẫu!");
    return;
  }

  const dsThuoc = [];
  $("#drugTable tbody tr").each(function () {
    const row = $(this);
    const tMa = row.find(".drug-id-input").val();

    if (tMa) {
      dsThuoc.push({
        t_ma: tMa,
        t_ten_thuoc: row.find(".drug-name-input").val(),
        t_don_vi_tinh: row.find(".drug-unit-input").val(),
        so_luong: row.find(".drug-qty-input").val(),
        lieu_dung: row.find(".drug-dosage-input").val(),
        cach_dung: row.find(".drug-usage-input").val(),
        nhom_thuoc: row.find(".drug-group-select").val(),
      });
    }
  });

  if (dsThuoc.length === 0) {
    alert("Vui lòng thêm ít nhất 1 loại thuốc!");
    return;
  }

  let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  const duLieuMau = {
    id: id || "user_" + Date.now(),
    ten: ten,
    thuoc: dsThuoc,
    benh: danhSachBenhDangChon,
  };

  if (id) {
    const index = list.findIndex((m) => m.id === id);
    if (index !== -1) list[index] = duLieuMau;
  } else {
    list.push(duLieuMau);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  bootstrap.Modal.getInstance(document.getElementById("templateModal")).hide();
  renderDanhSach();

  if (typeof hienThiThongBaoThanhCong === "function") {
    hienThiThongBaoThanhCong("Đã lưu đơn thuốc mẫu!");
  } else {
    alert("Đã lưu đơn thuốc mẫu!");
  }
}

function xoaDonMau(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa đơn mẫu này?")) return;
  let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  list = list.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  renderDanhSach();
}

function themDongThuocHTML(data = null) {
  const valTen = data ? data.t_ten_thuoc : "";
  const valMa = data ? data.t_ma : "";
  const valSL = data ? data.so_luong : 1;
  const valDonVi = data ? data.t_don_vi_tinh : "";
  const valNhom = data ? data.nhom_thuoc || data.nhom : "";
  const valLieuDung = data ? data.lieu_dung || "" : "";
  const valCachDung = data ? data.cach_dung || "" : "";

  let optionsNhom = '<option value=""> Chọn nhóm </option>';
  danhSachNhomThuoc.forEach((n) => {
    const isSelected = valNhom == n.nt_ma ? "selected" : "";
    optionsNhom += `<option value="${n.nt_ma}" ${isSelected}>${n.nt_ten}</option>`;
  });

  const html = `
        <tr>
            <td>
                <select class="form-select drug-group-select form-select-sm">
                    ${optionsNhom}
                </select>
            </td>
            <td>
                <input type="text" class="form-control drug-name-input form-control-sm" placeholder="Tên thuốc..." value="${valTen}">
                <input type="hidden" class="drug-id-input" value="${valMa}">
            </td>
            <td><input type="number" class="form-control text-center drug-qty-input form-control-sm" value="${valSL}" min="1"></td>
            <td><input type="text" class="form-control drug-unit-input form-control-sm" readonly value="${valDonVi}" placeholder="Đơn vị"></td>
            <td><input type="text" class="form-control drug-dosage-input form-control-sm" placeholder="Sáng 1..." value="${valLieuDung}"></td>
            <td><input type="text" class="form-control drug-usage-input form-control-sm" placeholder="Sau ăn..." value="${valCachDung}"></td>
            <td class="text-center"><button type="button" class="btn btn-danger btn-sm remove-drug"><i class="fas fa-trash"></i></button></td>
        </tr>
    `;

  const newRow = $(html).appendTo("#drugTable tbody");
  khoiTaoAutocomplete(newRow.find(".drug-name-input"));
}

function hienThiCanhBao(noiDung) {
  const modalEl = document.getElementById("warningModal");
  const msgEl = document.getElementById("warningMessage");

  if (modalEl && msgEl) {
    msgEl.innerText = noiDung;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } else {
    alert(noiDung);
  }
}

function khoiTaoAutocomplete(element) {
  element.autocomplete({
    source: function (request, response) {
      const row = element.closest("tr");
      const groupId = row.find(".drug-group-select").val();

      $.ajax({
        url: "/api/thuoc/tim-kiem",
        dataType: "json",
        data: { q: request.term, groupId: groupId },
        success: function (data) {
          response(
            $.map(data, function (item) {
              return {
                label: `${item.t_ten_thuoc} (${item.t_ham_luong || ""})`,
                value: item.t_ten_thuoc,
                id: item.t_ma,
                don_vi: item.t_don_vi_tinh,
                lieu_dung: item.t_lieu_dung_mac_dinh,
                cach_dung: item.t_cach_dung_mac_dinh,
                nhom_thuoc: item.t_loai_thuoc,
              };
            })
          );
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      const row = $(this).closest("tr");

      let isDuplicate = false;
      $(".drug-id-input")
        .not(row.find(".drug-id-input"))
        .each(function () {
          if ($(this).val() == ui.item.id) {
            isDuplicate = true;
            return false;
          }
        });

        if (isDuplicate) {
          hienThiCanhBao(`Thuốc "${ui.item.value}" đã có trong đơn mẫu này!`);
          $(this).val("");
          return false;
        }

      row.find(".drug-id-input").val(ui.item.id);
      row.find(".drug-unit-input").val(ui.item.don_vi || "");
      row.find(".drug-dosage-input").val(ui.item.lieu_dung || "");
      row.find(".drug-usage-input").val(ui.item.cach_dung || "");

      if (ui.item.nhom_thuoc) {
        row.find(".drug-group-select").val(ui.item.nhom_thuoc);
      }
    },
  });
}

function khoiTaoTimBenh() {
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
                label: item.b_ten,
                value: item.b_ten,
                id: item.b_ma,
                code: item.b_ma_icd
              };
            })
          );
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      themBenhVaoList(ui.item);
      $(this).val("");
      return false;
    },
  });
}

function themBenhVaoList(item) {
  if (danhSachBenhDangChon.find((b) => b.id === item.id)) return;
  danhSachBenhDangChon.push({ id: item.id, ten: item.label, code: item.code });
  renderTagsBenh();
}

function xoaBenhKhoiList(id) {
  danhSachBenhDangChon = danhSachBenhDangChon.filter((b) => b.id !== id);
  renderTagsBenh();
}

function renderTagsBenh() {
  const container = $("#danhSachBenhTags");
  container.empty();
  danhSachBenhDangChon.forEach((b) => {
    const tag = `
            <span class="badge bg-primary p-2">
                ${b.ten} - ${b.code}
                <i class="fas fa-times ms-2" style="cursor:pointer" onclick="xoaBenhKhoiList(${b.id})"></i>
            </span>
        `;
    container.append(tag);
  });
}
