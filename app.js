// Zmienne systemowe
const SERVER_URL = 'http://localhost:8000'; // Pamiętaj o zmianie na IP na czas testów z iPada
let allReels = []; // Tutaj trzymamy pobraną listę rolek

// Elementy nawigacji
const calendarView = document.getElementById('calendarView');
const formView = document.getElementById('formView');
const goToFormBtn = document.getElementById('goToFormBtn');
const goToCalendarBtn = document.getElementById('goToCalendarBtn');

// Elementy formularza
const fileInput = document.getElementById('videoFile');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('uploadForm');
const publishNowCb = document.getElementById('publishNow');
const dateContainer = document.getElementById('datePickerContainer');
const scheduleDateInput = document.getElementById('scheduleDate');

// Inicjalizacja przy starcie
document.addEventListener('DOMContentLoaded', fetchCalendarData);

// Nawigacja między ekranami
goToFormBtn.addEventListener('click', () => {
    calendarView.classList.remove('active');
    formView.classList.add('active');
});

goToCalendarBtn.addEventListener('click', () => {
    formView.classList.remove('active');
    calendarView.classList.add('active');
});

// Logika ukrywania kalendarza (Opublikuj natychmiast)
publishNowCb.addEventListener('change', () => {
    if (publishNowCb.checked) {
        dateContainer.style.display = 'none';
        scheduleDateInput.required = false;
    } else {
        dateContainer.style.display = 'block';
        scheduleDateInput.required = true;
    }
});

// Odblokowanie przycisku zapisu po wybraniu wideo
fileInput.addEventListener('change', () => {
    submitBtn.disabled = !fileInput.value;
});

// WYSYŁKA FORMULARZA
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    const desc = document.getElementById('description').value;
    
    let date = scheduleDateInput.value;
    if (publishNowCb.checked) {
        date = "TERAZ";
    }
    
    const selectedPlatforms = Array.from(document.querySelectorAll('.platform-cb:checked')).map(cb => cb.value);
    if (selectedPlatforms.length === 0) {
        alert("Wybierz przynajmniej jedną platformę!");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Wysyłanie na serwer...";

    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', desc);
    formData.append('schedule_date', date);
    formData.append('platforms', JSON.stringify(selectedPlatforms));

    try {
        const response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData });
        if (response.ok) {
            form.reset();
            submitBtn.disabled = true;
            submitBtn.innerText = "Zaplanuj";
            
            // Wracamy do kalendarza i odświeżamy dane!
            formView.classList.remove('active');
            calendarView.classList.add('active');
            await fetchCalendarData();
        } else {
            alert("Błąd zapisu na serwerze.");
            submitBtn.innerText = "Zaplanuj";
        }
    } catch (error) {
        alert("Brak połączenia z serwerem.");
        submitBtn.innerText = "Zaplanuj";
    }
});

// POBIERANIE DANYCH Z SERWERA
async function fetchCalendarData() {
    try {
        const response = await fetch(`${SERVER_URL}/scheduled`);
        allReels = await response.json();
        renderCalendarGrid();
    } catch (error) {
        console.error("Błąd pobierania kalendarza", error);
    }
}

// RYSOWANIE SIATKI MIESIĄCA I RÓLEK
function renderCalendarGrid() {
    const daysGrid = document.getElementById('daysGrid');
    const monthYearLabel = document.getElementById('monthYearLabel');
    daysGrid.innerHTML = '';

    const dzisiaj = new Date();
    const rok = dzisiaj.getFullYear();
    const miesiac = dzisiaj.getMonth(); // 0 = styczeń
    
    const nazwyMiesiecy = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    monthYearLabel.innerText = `${nazwyMiesiecy[miesiac]} ${rok}`;

    // Obliczanie dni w miesiącu
    const liczbaDni = new Date(rok, miesiac + 1, 0).getDate();
    
    // Obliczanie od jakiego dnia tygodnia zaczyna się miesiąc (0=niedziela)
    let pierwszyDzien = new Date(rok, miesiac, 1).getDay();
    pierwszyDzien = pierwszyDzien === 0 ? 6 : pierwszyDzien - 1; // Przesunięcie, by poniedziałek był 0

    // Puste komórki na początku miesiąca
    for (let i = 0; i < pierwszyDzien; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        daysGrid.appendChild(emptyCell);
    }

    // Właściwe dni miesiąca
    for (let dzien = 1; dzien <= liczbaDni; dzien++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        // Sprawdzanie czy to dzisiaj
        if (dzien === dzisiaj.getDate()) {
            dayCell.classList.add('today');
        }

        const dateLabel = document.createElement('div');
        dateLabel.className = 'day-number';
        dateLabel.innerText = dzien;
        dayCell.appendChild(dateLabel);

        // Szukanie rolek zaplanowanych na ten konkretny dzień
        // Data z Pythona wraca w formacie np. "2026-11-03T14:30"
        const dzienString = dzien.toString().padStart(2, '0');
        const miesiacString = (miesiac + 1).toString().padStart(2, '0');
        const prefixDaty = `${rok}-${miesiacString}-${dzienString}`;

        const rolkiNaTenDzien = allReels.filter(reel => reel.date.startsWith(prefixDaty));

        rolkiNaTenDzien.forEach(reel => {
            const godzina = reel.date.split('T')[1] || "";
            // Pobieramy opis zamiast nazwy pliku i ucinamy go, by zmieścił się w kafelku
            const krotkiOpis = reel.description ? 
                (reel.description.length > 15 ? reel.description.substring(0, 15) + '...' : reel.description) 
                : 'Brak opisu';

            // Tworzymy osobny kafelek dla każdej wybranej platformy
            reel.platforms.forEach(platform => {
                const divRolki = document.createElement('div');
                divRolki.className = `mini-reel ${platform}`;
                
                let nazwaPlatformy = platform.toUpperCase(); // YT, TT, IG, FB

                // Jeśli data publikacji już minęła lub jest "teraz"
                if (reel.date !== "TERAZ" && reel.date <= dzisiaj.toISOString().substring(0, 16)) {
                    divRolki.classList.add('teraz');
                    divRolki.innerText = `⏳ ${nazwaPlatformy}: ${krotkiOpis}`;
                } else {
                    divRolki.innerText = `${godzina} ${nazwaPlatformy}: ${krotkiOpis}`;
                }

                // --- NOWY KOD: Obsługa kliknięcia (usuwanie) ---
                divRolki.addEventListener('click', async () => {
                    // Wyświetla systemowe okienko potwierdzenia na iPadzie
                    const potwierdzenie = confirm(`Czy na pewno chcesz anulować publikację "${krotkiOpis}" i usunąć wideo z serwera?`);
                    
                    if (potwierdzenie) {
                        try {
                            const response = await fetch(`${SERVER_URL}/delete/${reel.id}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                // Odświeżamy kalendarz - usunięty kafelek natychmiast zniknie
                                fetchCalendarData();
                            } else {
                                alert("Wystąpił błąd po stronie serwera.");
                            }
                        } catch (error) {
                            alert("Brak połączenia z serwerem.");
                        }
                    }
                });
                // --- KONIEC NOWEGO KODU ---
                
                dayCell.appendChild(divRolki);
            });
        });

        daysGrid.appendChild(dayCell);
    }
}