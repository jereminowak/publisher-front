// Zmienne systemowe
const SERVER_URL = 'https://publisher-api.duckdns.org'; // Pamiętaj o zmianie na IP na czas testów z iPada
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

// Elementy podglądu okładki
const coverContainer = document.getElementById('cover-container');
const videoPreview = document.getElementById('video-preview');
const coverSlider = document.getElementById('cover-slider');
const coverCanvas = document.getElementById('cover-canvas');

// Inicjalizacja przy starcie
document.addEventListener('DOMContentLoaded', fetchCalendarData);

setInterval(() => {
    // Sprawdza, czy użytkownik jest na widoku kalendarza (żeby nie przerywać mu pracy w formularzu)
    if (calendarView.classList.contains('active')) {
        fetchCalendarData();
    }
}, 10000);

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

// Odblokowanie przycisku zapisu po wybraniu wideo oraz ładowanie podglądu okładki
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        submitBtn.disabled = false;
        
        // Ładowanie wideo do podglądu klatki
        videoPreview.src = URL.createObjectURL(file);
        coverContainer.style.display = 'block';
    } else {
        submitBtn.disabled = true;
        coverContainer.style.display = 'none';
    }
});

// Obsługa suwaka i długości wideo
videoPreview.addEventListener('loadedmetadata', function() {
    coverSlider.max = videoPreview.duration;
    coverSlider.value = 0;
    videoPreview.currentTime = 0;
});

// Przewijanie wideo podczas suwania
coverSlider.addEventListener('input', function() {
    videoPreview.currentTime = this.value;
});

// WYSYŁKA FORMULARZA (musi być async)
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
    submitBtn.innerText = "Przygotowywanie i wysyłanie na serwer...";

    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', desc);
    formData.append('schedule_date', date);
    formData.append('platforms', JSON.stringify(selectedPlatforms));

    // --- GENEROWANIE KLATKI OKŁADKI DO WYSYŁKI ---
    const ctx = coverCanvas.getContext('2d');
    coverCanvas.width = videoPreview.videoWidth;
    coverCanvas.height = videoPreview.videoHeight;
    ctx.drawImage(videoPreview, 0, 0, coverCanvas.width, coverCanvas.height);

    const coverBlob = await new Promise(resolve => coverCanvas.toBlob(resolve, 'image/jpeg', 0.8));
    formData.append('thumbnail', coverBlob, 'thumbnail.jpg');
    // --------------------------------------------

    try {
        const response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData });
        if (response.ok) {
            form.reset();
            coverContainer.style.display = 'none'; // Chowamy suwak po udanej wysyłce
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
        const dzienString = dzien.toString().padStart(2, '0');
        const miesiacString = (miesiac + 1).toString().padStart(2, '0');
        const prefixDaty = `${rok}-${miesiacString}-${dzienString}`;

        const rolkiNaTenDzien = allReels.filter(reel => reel.date.startsWith(prefixDaty));

        rolkiNaTenDzien.forEach(reel => {
            const godzina = reel.date.split('T')[1] || "";
            const krotkiOpis = reel.description ? 
                (reel.description.length > 15 ? reel.description.substring(0, 15) + '...' : reel.description) 
                : 'Brak opisu';

            reel.platforms.forEach(platform => {
                const divRolki = document.createElement('div');
                divRolki.className = `mini-reel ${platform}`;
                
                let nazwaPlatformy = platform.toUpperCase();

                // HISTORIA: Ustawianie wyglądu w zależności od statusu
                if (reel.status === 'published') {
                    divRolki.classList.add('published');
                    divRolki.innerText = `✅ ${nazwaPlatformy}: ${krotkiOpis}`;
                } else if (reel.date !== "TERAZ" && reel.date <= dzisiaj.toISOString().substring(0, 16)) {
                    divRolki.classList.add('teraz');
                    divRolki.innerText = `⏳ ${nazwaPlatformy}: ${krotkiOpis}`;
                } else {
                    divRolki.innerText = `${godzina} ${nazwaPlatformy}: ${krotkiOpis}`;
                }

                // Usuwanie (pozostawione dla rolek pending)
                divRolki.addEventListener('click', async () => {
                    if (reel.status === 'published') {
                        // Opcjonalnie: można zablokować usuwanie opublikowanych rolek lub poprosić o potwierdzenie zniknięcia z historii
                        const potwierdzenie = confirm(`Ta rolka została już opublikowana. Czy na pewno chcesz usunąć ten wpis z historii?`);
                        if (!potwierdzenie) return;
                    } else {
                        const potwierdzenie = confirm(`Czy na pewno chcesz anulować publikację "${krotkiOpis}" i usunąć wideo z serwera?`);
                        if (!potwierdzenie) return;
                    }
                    
                    try {
                        const response = await fetch(`${SERVER_URL}/delete/${reel.id}`, { method: 'DELETE' });
                        if (response.ok) {
                            fetchCalendarData();
                        } else {
                            alert("Wystąpił błąd po stronie serwera.");
                        }
                    } catch (error) {
                        alert("Brak połączenia z serwerem.");
                    }
                });
                
                dayCell.appendChild(divRolki);
            });
        });

        daysGrid.appendChild(dayCell);
    }
}