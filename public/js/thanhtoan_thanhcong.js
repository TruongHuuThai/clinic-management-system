function inHoaDonPDF(maHoaDon) {
  const element = document.getElementById("invoice-area");
  element.style.display = "block";

  const opt = {
    margin: 10,
    filename: "Hoa_Don_" + maHoaDon + ".pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      element.style.display = "none";
    });
}

function moModalEmail() {
  const modalElement = document.getElementById("emailModal");
  const modal = new bootstrap.Modal(modalElement);

  const emailInput = document.getElementById("customerEmail");
  emailInput.value = "";

  modal.show();

  setTimeout(() => {
    emailInput.focus();
  }, 500);
}

async function guiEmailHoaDon() {
  const emailInput = document.getElementById("customerEmail");
  const email = emailInput.value.trim();
  const maHoaDonEl = document.getElementById("hiddenInvoiceId");
  const btn = document.getElementById("btnSendEmailAction");

  if (!maHoaDonEl) return;
  const maHoaDon = maHoaDonEl.value;

  if (!email) {
    alert("Vui lòng nhập địa chỉ email!");
    emailInput.focus();
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  btn.disabled = true;

  try {
    const element = document.getElementById("invoice-area");
    element.style.display = "block";

    const opt = {
      margin: 10,
      filename: `Hoa_Don_${maHoaDon}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    const pdfBlob = await html2pdf().set(opt).from(element).output("blob");
    element.style.display = "none";

    const formData = new FormData();
    formData.append("email", email);
    formData.append("maHoaDon", maHoaDon);
    formData.append("file_hoa_don", pdfBlob, `Hoa_Don_${maHoaDon}.pdf`);

    const response = await fetch("/api/thanh-toan/send-email", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      const modalEl = document.getElementById("emailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      alert("Đã gửi hóa đơn thành công!");
    } else {
      throw new Error(data.message || "Gửi thất bại");
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi: " + err.message);
    document.getElementById("invoice-area").style.display = "none";
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
