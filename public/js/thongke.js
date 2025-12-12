let revChartInstance = null;
let diseaseChartInstance = null;
let medChartInstance = null;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

async function loadData() {

  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  const response = await fetch(
    `/api/thong-ke/data?startDate=${start}&endDate=${end}`
  );

  if (!response.ok) {
    alert("Không tải được dữ liệu!");
    return;
  }

  const data = await response.json();

  document.getElementById("totalRevenueDisplay").innerText = formatCurrency(
    data.totalRevenue
  );
  document.getElementById("totalPatientsDisplay").innerText =
    data.totalPatients;

  renderRevenueChart(data.revenueChart);
  renderDiseaseChart(data.topDiseases);
  renderMedicineChart(data.topMeds);
}

function renderRevenueChart(data) {
  const ctx = document.getElementById("revenueChart").getContext("2d");
  if (revChartInstance) revChartInstance.destroy();

  const labels = data.map((item) => item.ngay);
  const values = data.map((item) => item.doanh_thu);

  revChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Doanh Thu (VNĐ)",
          data: values,
          borderColor: "#4e73df",
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderDiseaseChart(data) {
  const ctx = document.getElementById("diseaseChart").getContext("2d");
  if (diseaseChartInstance) diseaseChartInstance.destroy();

  const labels = data.map((item) => item.b_ten);
  const values = data.map((item) => item.so_luong);

  diseaseChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#4e73df",
            "#1cc88a",
            "#36b9cc",
            "#f6c23e",
            "#e74a3b",
          ],
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

function renderMedicineChart(data) {
  const ctx = document.getElementById("medicineChart").getContext("2d");
  if (medChartInstance) medChartInstance.destroy();

  const labels = data.map((item) => item.t_ten_thuoc);
  const values = data.map((item) => item.tong_so);

  medChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Số lượng viên/đơn vị",
          data: values,
          backgroundColor: "#36b9cc",
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const configFlatpickr = {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: "vn",
    allowInput: true,
  };
  flatpickr("#startDate", {
    ...configFlatpickr,
    defaultDate: firstDay,
  });

  flatpickr("#endDate", {
    ...configFlatpickr,
    defaultDate: today,
  });

  loadData();
});
