function applyFilters() {
    const form = document.getElementById('filterForm');
    const search = form.elements.search.value;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    window.location.href = '/api/patients?' + params.toString();
}

function resetFilters() {
    window.location.href = '/api/patients';
}

function chiTietBenhNhan(bn_ma) {
    window.location.href = `/api/patients/${bn_ma}`;
}

function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}

function themMoiBenhNhan() {
    window.location.href = '/api/patients/new';
}