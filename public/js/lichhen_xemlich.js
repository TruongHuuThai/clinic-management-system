// public/js/calendar_view.js

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('fullCalendar');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listContainer = document.getElementById('list-container');
    const calendarContainer = document.getElementById('calendar-container');
    
    if (!calendarEl) return;

    function toggleView(isCalendar) {
        if (isCalendar) {
            listContainer.style.display = 'none';
            calendarContainer.style.display = 'block';
            calendarViewBtn.className = 'btn btn-info';
            listViewBtn.className = 'btn btn-outline-info';
        } else {
            listContainer.style.display = 'block';
            calendarContainer.style.display = 'none';
            listViewBtn.className = 'btn btn-info';
            calendarViewBtn.className = 'btn btn-outline-info';
        }
    }
    
    listViewBtn.addEventListener('click', () => toggleView(false));
    calendarViewBtn.addEventListener('click', () => toggleView(true));

    async function fetchCalendarEvents() {
        try {
            const response = await fetch('/api/appointments'); 
            if (!response.ok) throw new Error('Failed to fetch appointments');
            
            const data = await response.json();
            
            return data.map(app => ({
                id: app.lh_ma,
                title: `${app.name} (${app.time})`,
                start: `${app.date}T${app.time}`,
                extendedProps: {
                    status: app.status
                },
                color: app.status === 'Đã đến' ? '#4CAF50' : '#2196F3' 
            }));
            
        } catch (error) {
            console.error("Error loading calendar data:", error);
            return [];
        }
    }
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'vi',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: fetchCalendarEvents 
    });

    calendar.render();
    
    toggleView(false);
});