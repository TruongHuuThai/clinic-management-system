function inHoaDonPDF(maHoaDon) {
  const element = document.getElementById("invoice-area");

  element.style.display = "block";

  const opt = {
    margin: 10,
    filename: "Hoa_Don_" + maHoaDon + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
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
    const modalElement = document.getElementById('emailModal');
    const modal = new bootstrap.Modal(modalElement);
    
    document.getElementById('customerEmail').value = '';
    
    modal.show();
    
    setTimeout(() => {
        document.getElementById('customerEmail').focus();
    }, 500);
}

async function guiEmailHoaDon() {
  const emailInput = document.getElementById("customerEmail");
  const email = emailInput.value.trim();
  const maHoaDonEl = document.getElementById("hiddenInvoiceId");

  if (!maHoaDonEl) {
    alert("Lỗi: Không tìm thấy mã hóa đơn.");
    return;
  }
  const maHoaDon = maHoaDonEl.value;

  if (!email) {
    alert("Vui lòng nhập email!");
    emailInput.focus();
    return;
  }

  const btn = document.getElementById("btnSendEmailAction");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Đang tạo PDF...';
  btn.disabled = true;

  try {
    const element = document.getElementById("invoice-area");
    if (!element) throw new Error("Không tìm thấy mẫu hóa đơn để tạo PDF.");

    element.style.display = "block";

    const opt = {
      margin: 10,
      filename: `Hoa_Don_${maHoaDon}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    const pdfBlob = await html2pdf().set(opt).from(element).output("blob");

    element.style.display = "none";

    btn.innerHTML =
      '<i class="fas fa-paper-plane fa-beat"></i> Đang gửi mail...';

    const formData = new FormData();
    formData.append("email", email);
    formData.append("maHoaDon", maHoaDon);
    formData.append("file_hoa_don", pdfBlob, `Hoa_Don_${maHoaDon}.pdf`);

    const res = await fetch("/api/thanh-toan/send-email", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      const modalEl = document.getElementById("emailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Đã gửi hóa đơn PDF thành công!");
      } else {
        alert("Đã gửi thành công!");
      }
    } else {
      alert("Lỗi: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi: " + err.message);
    const el = document.getElementById("invoice-area");
    if (el) el.style.display = "none";
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
