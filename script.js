document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        selectable: true,
        locale: 'uk',
        firstDay: 1,
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today'
        },
        views: {
            dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'short' }
            }
        },
        dateClick: function(info) {
            selectDate(info);
        },
        events: [],
        eventDisplay: 'background',
        eventColor: '#ff6b6b',
        height: 'auto',
        aspectRatio: 1,
        dayMaxEventRows: 2,
        handleWindowResize: true
    });
    
    calendar.render();
    
    let selectedDates = [];
    let currentLanguage = 'uk';
    let currentRoom = 'house';
    
    const roomButtons = {
        'house': document.getElementById('house-btn'),
        'room4': document.getElementById('room4-btn'),
        'room3': document.getElementById('room3-btn'),
        'room2': document.getElementById('room2-btn'),
        'room1': document.getElementById('room1-btn')
    };
    
    const formTitle = document.getElementById('form-title');
    const datesInput = document.getElementById('dates');
    const bookingForm = document.getElementById('booking-form');
    const successMessage = document.getElementById('success-message');
    const successDetails = document.getElementById('success-details');
    const newBookingBtn = document.getElementById('new-booking-btn');
    const langUkBtn = document.getElementById('lang-uk');
    const langEnBtn = document.getElementById('lang-en');
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    function initTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        const telegramDark = Telegram.WebApp.colorScheme === 'dark';
        
        if (savedDarkMode || telegramDark || (prefersDark && localStorage.getItem('darkMode') === null)) {
            document.body.classList.add('dark-mode');
        }
        
        updateThemeButton();
        
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.setHeaderColor('#2a7f62');
            Telegram.WebApp.setBackgroundColor(
                document.body.classList.contains('dark-mode') ? '#121212' : '#f5f5f5'
            );
            
            Telegram.WebApp.onEvent('themeChanged', () => {
                const isDark = Telegram.WebApp.colorScheme === 'dark';
                document.body.classList.toggle('dark-mode', isDark);
                localStorage.setItem('darkMode', isDark);
                updateThemeButton();
            });
        }
    }
    
    function updateThemeButton() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeToggleBtn.innerHTML = isDarkMode ? 
            '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>' : 
            '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"/></svg>';
    }
    
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        updateThemeButton();
        
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.setBackgroundColor(isDarkMode ? '#121212' : '#f5f5f5');
        }
    });
    
    async function loadBookedDates() {
        try {
            const response = await fetch(`/api/bookings/dates?room=${currentRoom}`);
            if (!response.ok) throw new Error('Failed to load booked dates');
            
            const bookedDates = await response.json();
            
            calendar.removeAllEvents();
            bookedDates.forEach(({ start_date, end_date }) => {
                calendar.addEvent({
                    start: start_date,
                    end: end_date,
                    display: 'background',
                    color: '#ff6b6b',
                    allDay: true
                });
            });
        } catch (error) {
            console.error('Error loading booked dates:', error);
            showAlert(currentLanguage === 'uk' 
                ? 'Помилка завантаження зайнятих дат' 
                : 'Error loading booked dates');
        }
    }
    
    function selectDate(info) {
        const dateStr = info.dateStr;
        
        const events = calendar.getEvents();
        const isDateBooked = events.some(event => {
            const eventStart = event.startStr;
            const eventEnd = event.end ? new Date(event.end) : new Date(event.start);
            eventEnd.setDate(eventEnd.getDate() - 1);
            
            const selectedDate = new Date(dateStr);
            
            return selectedDate >= new Date(eventStart) && selectedDate <= eventEnd;
        });
        
        if (isDateBooked) {
            showAlert(currentLanguage === 'uk' 
                ? 'Ця дата вже зайнята, будь ласка, оберіть іншу' 
                : 'This date is already booked, please select another');
            return;
        }
        
        if (selectedDates.length === 0) {
            selectedDates = [dateStr];
        } else if (selectedDates.length === 1) {
            if (new Date(dateStr) > new Date(selectedDates[0])) {
                selectedDates.push(dateStr);
                
                const MIN_STAY = 2;
                const MAX_STAY = 14; 
                
                const nights = Math.ceil((new Date(selectedDates[1]) - new Date(selectedDates[0])) / (1000*60*60*24));
                
                if (nights < MIN_STAY) {
                    showAlert(currentLanguage === 'uk' 
                        ? `Мінімальний період бронювання - ${MIN_STAY} ночі` 
                        : `Minimum stay is ${MIN_STAY} nights`);
                    selectedDates = [];
                    return;
                }
                
                if (nights > MAX_STAY) {
                    showAlert(currentLanguage === 'uk' 
                        ? `Максимальний період бронювання - ${MAX_STAY} ночей` 
                        : `Maximum stay is ${MAX_STAY} nights`);
                    selectedDates = [];
                    return;
                }
                
                let current = new Date(selectedDates[0]);
                while (current <= new Date(selectedDates[1])) {
                    const currentDateStr = current.toISOString().split('T')[0];
                    const isCurrentDateBooked = events.some(event => {
                        const eventStart = event.startStr;
                        const eventEnd = event.end ? new Date(event.end) : new Date(event.start);
                        eventEnd.setDate(eventEnd.getDate() - 1);
                        
                        return currentDateStr >= eventStart && currentDateStr <= eventEnd.toISOString().split('T')[0];
                    });
                    
                    if (isCurrentDateBooked) {
                        showAlert(currentLanguage === 'uk' 
                            ? `Дата ${formatDate(currentDateStr)} вже зайнята, будь ласка, оберіть інший діапазон` 
                            : `Date ${formatDate(currentDateStr)} is already booked, please select another range`);
                        selectedDates = [dateStr];
                        break;
                    }
                    current.setDate(current.getDate() + 1);
                }
            } else {
                selectedDates = [dateStr];
            }
        } else {
            selectedDates = [dateStr];
        }
        
        datesInput.value = selectedDates.length === 2 
            ? `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[1])}`
            : formatDate(selectedDates[0]);
        
        updateCalendarStyles();
    }
    
    function updateCalendarStyles() {
        document.querySelectorAll('.fc-day-selected').forEach(el => {
            el.classList.remove('fc-day-selected');
        });
        
        if (selectedDates.length === 1) {
            const date = selectedDates[0];
            const cell = document.querySelector(`.fc-day[data-date="${date}"]`);
            if (cell) cell.classList.add('fc-day-selected');
        } else if (selectedDates.length === 2) {
            const start = new Date(selectedDates[0]);
            const end = new Date(selectedDates[1]);
            
            let current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                const cell = document.querySelector(`.fc-day[data-date="${dateStr}"]`);
                if (cell) cell.classList.add('fc-day-selected');
                current.setDate(current.getDate() + 1);
            }
        }
    }
    
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString(currentLanguage === 'uk' ? 'uk-UA' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    function showAlert(message) {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }
    
    Object.keys(roomButtons).forEach(room => {
        roomButtons[room].addEventListener('click', function() {
            currentRoom = room;
            
            Object.values(roomButtons).forEach(btn => btn.classList.remove('active'));
            roomButtons[room].classList.add('active');
            
            updateFormTitle();
            
            selectedDates = [];
            datesInput.value = '';
            updateCalendarStyles();
            
            loadBookedDates();
        });
    });
    
    function updateFormTitle() {
        if (currentLanguage === 'uk') {
            const titles = {
                'house': 'Бронювання будинку',
                'room4': 'Бронювання двомісного номера №4',
                'room3': 'Бронювання двомісного номера №3',
                'room2': 'Бронювання сімейного номера №2',
                'room1': 'Бронювання сімейного номера №1'
            };
            formTitle.textContent = titles[currentRoom];
        } else {
            const titles = {
                'house': 'House Booking',
                'room4': 'Double Room #4 Booking',
                'room3': 'Double Room #3 Booking',
                'room2': 'Family Room #2 Booking',
                'room1': 'Family Room #1 Booking'
            };
            formTitle.textContent = titles[currentRoom];
        }
    }
    
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (selectedDates.length === 0) {
            showAlert(currentLanguage === 'uk' ? 'Будь ласка, виберіть дату' : 'Please select a date');
            return;
        }
        
        if (selectedDates.length !== 2) {
            showAlert(currentLanguage === 'uk' 
                ? 'Будь ласка, виберіть діапазон дат (прибуття та виїзд)' 
                : 'Please select a date range (check-in and check-out)');
            return;
        }
        
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        const phoneValue = document.getElementById('phone').value;
        if (!phoneRegex.test(phoneValue)) {
            showAlert(currentLanguage === 'uk' 
                ? 'Будь ласка, введіть коректний номер телефону' 
                : 'Please enter a valid phone number');
            return;
        }
        
        const formData = {
            name: document.getElementById('name').value,
            phone: phoneValue,
            room: currentRoom,
            check_in: selectedDates[0],
            check_out: selectedDates[1]
        };
        
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            
            if (!response.ok) {
                throw new Error(await response.text());
            }
            
            const bookingResult = await response.json();
            showSuccessMessage(formData, bookingResult);
            loadBookedDates();
            
        } catch (error) {
            console.error('Booking error:', error);
            showAlert(currentLanguage === 'uk' 
                ? 'Помилка при бронюванні: ' + error.message 
                : 'Booking error: ' + error.message);
        }
    });
    
    function showSuccessMessage(formData, bookingResult) {
        let successText;
        
        if (currentLanguage === 'uk') {
            const roomNames = {
                'house': 'Будинок',
                'room4': 'Двомісний номер №4',
                'room3': 'Двомісний номер №3',
                'room2': 'Сімейний номер №2',
                'room1': 'Сімейний номер №1'
            };
            
            successText = `
                <p><strong>Дякуємо за бронювання, ${formData.name}!</strong></p>
                <p>Тип: ${roomNames[formData.room]}</p>
                <p>Дата: ${formatDate(formData.check_in)} - ${formatDate(formData.check_out)}</p>
                <p>Номер бронювання: ${bookingResult.id}</p>
                <p>Ми зв'яжемося з вами за номером ${formData.phone} для підтвердження.</p>
            `;
        } else {
            const roomNames = {
                'house': 'House',
                'room4': 'Double Room #4',
                'room3': 'Double Room #3',
                'room2': 'Family Room #2',
                'room1': 'Family Room #1'
            };
            
            successText = `
                <p><strong>Thank you for booking, ${formData.name}!</strong></p>
                <p>Type: ${roomNames[formData.room]}</p>
                <p>Date: ${formatDate(formData.check_in)} - ${formatDate(formData.check_out)}</p>
                <p>Booking ID: ${bookingResult.id}</p>
                <p>We will contact you at ${formData.phone} to confirm.</p>
            `;
        }
        
        successDetails.innerHTML = successText;
        bookingForm.reset();
        selectedDates = [];
        updateCalendarStyles();
        
        bookingForm.classList.add('hidden');
        successMessage.classList.remove('hidden');
        
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.sendData(JSON.stringify({
                ...formData,
                bookingId: bookingResult.id
            }));
        }
    }
    
    newBookingBtn.addEventListener('click', function() {
        bookingForm.classList.remove('hidden');
        successMessage.classList.add('hidden');
    });
    
    langUkBtn.addEventListener('click', function() {
        currentLanguage = 'uk';
        langUkBtn.classList.add('active');
        langEnBtn.classList.remove('active');
        updateLanguage();
    });
    
    langEnBtn.addEventListener('click', function() {
        currentLanguage = 'en';
        langEnBtn.classList.add('active');
        langUkBtn.classList.remove('active');
        updateLanguage();
    });
    
    function updateLanguage() {
        calendar.setOption('locale', currentLanguage);
        
        if (currentLanguage === 'uk') {
            document.querySelector('title').textContent = 'Лісова Хатина - Бронювання';
            
            roomButtons.house.textContent = 'Будинок';
            roomButtons.room4.textContent = 'Двомісний №4';
            roomButtons.room3.textContent = 'Двомісний №3';
            roomButtons.room2.textContent = 'Сімейний №2';
            roomButtons.room1.textContent = 'Сімейний №1';
            
            document.querySelector('label[for="name"]').textContent = "Ім'я";
            document.querySelector('label[for="phone"]').textContent = "Телефон";
            document.querySelector('label[for="dates"]').textContent = "Дата";
            document.querySelector('.submit-btn').textContent = "Забронювати";
            
            if (successMessage && !successMessage.classList.contains('hidden')) {
                successMessage.querySelector('h2').textContent = "Бронювання успішне! 🎉";
                newBookingBtn.textContent = "Нове бронювання";
            }
        } else {
            document.querySelector('title').textContent = 'Forest Hut - Booking';
            
            roomButtons.house.textContent = 'House';
            roomButtons.room4.textContent = 'Double #4';
            roomButtons.room3.textContent = 'Double #3';
            roomButtons.room2.textContent = 'Family #2';
            roomButtons.room1.textContent = 'Family #1';
            
            document.querySelector('label[for="name"]').textContent = "Name";
            document.querySelector('label[for="phone"]').textContent = "Phone";
            document.querySelector('label[for="dates"]').textContent = "Date";
            document.querySelector('.submit-btn').textContent = "Book now";
            
            if (successMessage && !successMessage.classList.contains('hidden')) {
                successMessage.querySelector('h2').textContent = "Booking successful! 🎉";
                newBookingBtn.textContent = "New booking";
            }
        }
        
        updateFormTitle();
        
        if (selectedDates.length > 0) {
            datesInput.value = selectedDates.length === 2 
                ? `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[1])}`
                : formatDate(selectedDates[0]);
        }
    }
    
    initTheme();
    loadBookedDates();
});