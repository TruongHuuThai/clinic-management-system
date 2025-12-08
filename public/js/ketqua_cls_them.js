$(document).ready(function () {
  $(".file-input").change(function () {
    const file = this.files[0];
    const previewImg = $(this).siblings(".preview-image");

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        previewImg.attr("src", e.target.result).show();
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.hide();
    }
  });

  $('input[name^="kqcls_ketluan_"]').on("input", function () {
    if ($(this).val().trim() !== "") {
      $(this).closest("tr").find(".status-select").val("DA_CO_KET_QUA");
    }
  });
});

async function quetAnhAI(maChiTiet, btnElement) {
  const fileInput = document.getElementById(`file-${maChiTiet}`);
  const textAreaMoTa = document.querySelector(
    `textarea[name="kqcls_mota_${maChiTiet}"]`
  );

  if (!fileInput.files || !fileInput.files[0]) {
    alert("Vui lòng chọn file ảnh kết quả xét nghiệm trước!");
    return;
  }

  const file = fileInput.files[0];
  const nutBam = btnElement || event.currentTarget;
  const noiDungCu = nutBam.innerHTML;
  nutBam.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang đọc...`;
  nutBam.disabled = true;
  textAreaMoTa.placeholder = "AI đang đọc kết quả từ ảnh... Vui lòng đợi...";

  try {
    const formData = new FormData();
    formData.append("file_anh", file); 

    const res = await fetch("/api/ocr/phan-tich", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok && data.success) {
      textAreaMoTa.value = data.text;
      const row = textAreaMoTa.closest("tr");
      const statusSelect = row.querySelector(".status-select");
      if (statusSelect) statusSelect.value = "DA_CO_KET_QUA";
    } else {
      alert("Lỗi AI: " + (data.message || "Không đọc được ảnh"));
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server.");
  } finally {
    nutBam.innerHTML = noiDungCu;
    nutBam.disabled = false;
    textAreaMoTa.placeholder = "";
  }
}
