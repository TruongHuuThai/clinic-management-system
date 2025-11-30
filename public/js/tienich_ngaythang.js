$(document).ready(function() {

    $("#dateFrom").datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true,
        yearRange: "1940:2030",
        minDate: null, 
        closeText: 'Đóng',
        currentText: 'Hôm nay',
    });

    $("#dateFrom").each(function() {
        let $input = $(this);
        let isoValue = $input.val(); 
        
        if (isoValue && isoValue.includes('-')) {
            let parts = isoValue.split('-');
            let displayValue = parts[2] + '/' + parts[1] + '/' + parts[0]; 
            $input.val(displayValue);
        }
    });

    $('#filterForm').off('submit').on('submit', function(e) {
        e.preventDefault(); 
        applyFilters();  
    });
});