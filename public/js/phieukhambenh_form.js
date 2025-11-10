let drugGroups = [];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function populateGroupSelect($selectElement) {
  $selectElement
    .empty()
    .append('<option value="">--- Chọn Nhóm Thuốc ---</option>');
  drugGroups.forEach((group) => {
    $selectElement.append(
      `<option value="${group.nt_ma}">${group.nt_ten}</option>`
    );
  });
}

function initAutocomplete(rowId) {
  const $drugInput = $(`#drugNameInput-${rowId}`);
  const $hiddenId = $(`#drugIdHidden-${rowId}`);
  const $groupSelect = $(`#drugGroupSelect-${rowId}`);

  let currentDrugList = [];

  $groupSelect.on("change", function () {
    const nt_ma = $(this).val();

    $drugInput.val("");
    $hiddenId.val("");

    if (!nt_ma) {
      currentDrugList = [];
      $drugInput.autocomplete("option", "source", []);
      return;
    }

    fetch(`/api/thuoc/theo-nhom/${nt_ma}`)
      .then((res) => res.json())
      .then((data) => {
        currentDrugList = data.map((item) => ({
          label: item.t_ten_thuoc,
          value: item.t_ten_thuoc,
          id: item.t_ma,
        }));

        $drugInput.autocomplete("option", "source", currentDrugList);
      })
      .catch((error) => console.error("Lỗi tải thuốc:", error));
  });

  $drugInput.autocomplete({
    minLength: 2,
    source: [],
    select: function (event, ui) {
      $drugInput.val(ui.item.value);
      $hiddenId.val(ui.item.id);
      return false;
    },

    search: function (event, ui) {
      if (!$groupSelect.val()) {
        $drugInput.val("");
        return false;
      }
    },
  });
}

$(document).ready(function () {
  const drugTableBody = $("#drugTable tbody");
  const addDrugButton = $("#addDrugButton");

  fetch("/api/nhom-thuoc")
    .then((res) => res.json())
    .then((data) => {
      drugGroups = data;
      initDrugRow(drugTableBody.find("tr").first());
    })
    .catch((error) => console.error("Lỗi tải nhóm thuốc:", error));

  function createDrugRow() {
    const rowId = generateId();
    const newRow = $(`
                <tr>
                    <td>
                        <select name="maNhom[]" class="form-select drug-group-select" id="drugGroupSelect-${rowId}" required>
                        </select>
                    </td>
                    <td>
                        <input type="text" name="thuoc_ten[]" class="form-control" placeholder="Gõ tên thuốc..." id="drugNameInput-${rowId}" required>
                        <input type="hidden" name="thuoc_ma[]" id="drugIdHidden-${rowId}">
                    </td>
                    <td><input type="number" name="so_luong[]" class="form-control" min="1" required></td>
                    <td><input type="text" name="cach_dung[]" class="form-control" placeholder="Ngày 2 lần, mỗi lần 1 viên..." required></td>
                    <td><button type="button" class="btn btn-danger btn-sm remove-drug">Xóa</button></td>
                </tr>
            `);
    drugTableBody.append(newRow);

    // Khởi tạo các hàm cho hàng mới
    initDrugRow(newRow);
  }

  // Hàm khởi tạo các thành phần của hàng (select, autocomplete)
  function initDrugRow($row) {
    const rowId = $row
      .find(".drug-group-select")
      .attr("id")
      .replace("drugGroupSelect-", "");

    // 1. Điền Nhóm Thuốc
    populateGroupSelect($row.find(".drug-group-select"));

    // 2. Khởi tạo Autocomplete và sự kiện change
    initAutocomplete(rowId);
  }

  addDrugButton.on("click", createDrugRow);

  drugTableBody.on("click", ".remove-drug", function (e) {
    if (drugTableBody.children().length > 1) {
      $(this).closest("tr").remove();
    }
  });
});
