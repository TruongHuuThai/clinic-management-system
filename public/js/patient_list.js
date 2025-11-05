function chiTietBenhNhan(bn_ma) {
        window.location.href = `/api/patient_detail/${bn_ma}`;
    }

function danhSachBenhNhan(){
    window.location.href = "/api/patients";
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}