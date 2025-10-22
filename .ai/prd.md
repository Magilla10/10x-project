# Dokument wymagań produktu (PRD) - AI Flashcard Generator

## 1. Przegląd produktu

### Nazwa produktu

AI Flashcard Generator

### Cel produktu

Stworzenie MVP aplikacji webowej do automatycznego generowania wysokiej jakości fiszek edukacyjnych z wykorzystaniem sztucznej inteligencji, która rozwiązuje problem czasochłonności manualnego tworzenia fiszek i zachęca do korzystania z efektywnej metody nauki spaced repetition.

### Grupa docelowa

Uniwersalna - każda osoba zainteresowana efektywną nauką może korzystać z aplikacji do tworzenia fiszek.

### Kluczowe założenia

- Aplikacja webowa (bez wersji mobilnej w MVP)
- Integracja z gotowym algorytmem powtórek
- Prosty i intuicyjny interfejs użytkownika
- Izolacja danych użytkowników
- Generacja fiszek w czasie rzeczywistym (max 5 sekund)

## 2. Problem użytkownika

### Główny problem

Manualne tworzenie wysokiej jakości fiszek edukacyjnych jest czasochłonne, co zniechęca do korzystania z efektywnej metody nauki jaką jest spaced repetition.

### Kontekst problemu

- Użytkownicy chcą efektywnie się uczyć używając metody spaced repetition
- Tworzenie fiszek ręcznie zajmuje dużo czasu i wysiłku
- Brak narzędzi do szybkiego generowania fiszek z tekstu źródłowego
- Istniejące rozwiązania wymagają manualnego wprowadzania każdej fiszki

### Wpływ problemu

- Użytkownicy rezygnują z efektywnej metody nauki
- Ograniczona liczba fiszek do nauki
- Niska motywacja do kontynuowania nauki
- Nieefektywne wykorzystanie czasu na naukę

## 3. Wymagania funkcjonalne

### Podstawowe funkcjonalności

1. **Generowanie fiszek przez AI**
   - Wprowadzanie tekstu źródłowego (kopiuj-wklej)
   - Automatyczne generowanie fiszek w formacie przód/tył
   - Limit 200 znaków na przód, 500 znaków na tył
   - Czas generacji maksymalnie 5 sekund
   - Pole tekstowe do generowania przyjmuje od 1000 do 10 000 znaków

2. **Manualne tworzenie fiszek**
   - Możliwość ręcznego wprowadzania fiszek (przód i tył) oraz ich wyświetlanie w widoku listy "Moje fiszki"
   - Edycja obu stron fiszki (przód i tył)
   - Walidacja limitów znaków

3. **Zarządzanie fiszkami**
   - Przeglądanie wszystkich fiszek użytkownika
   - Edycja istniejących fiszek
   - Usuwanie fiszek
   - Limit 15 fiszek na użytkownika

4. **System kont użytkowników**
   - Rejestracja i logowanie (email/hasło)
   - Izolacja danych użytkowników
   - Dostęp tylko do własnych fiszek

5. **Integracja z algorytmem powtórek**
   - Wyświetlanie fiszek do powtórki
   - Podstawowy system powtórek

6. **Usuwanie konta i danych**
   - Użytkownik ma możliwość trwałego usunięcia konta
   - Usunięcie konta powoduje nieodwracalne skasowanie wszystkich jego fiszek

### Wymagania techniczne

- Aplikacja webowa
- Baza danych do przechowywania fiszek i użytkowników
- Tabela logów generowania dla analizy jakości AI
- System obsługi błędów z komunikatami na czerwono
- Zbieranie informacji o liczbie wygenerowanych i ostatecznie zatwierdzonych fiszek (na potrzeby metryk)
- Przechowywanie danych w sposób bezpieczny, z możliwością realizacji żądań usunięcia danych użytkownika

## 4. Granice produktu

### Co NIE wchodzi w zakres MVP

- Własny, zaawansowany algorytm powtórek (jak SuperMemo, Anki)
- Import wielu formatów (PDF, DOCX, itp.)
- Współdzielenie zestawów fiszek między użytkownikami
- Integracje z innymi platformami edukacyjnymi
- Aplikacje mobilne (na początek tylko web)
- System kategorii/tagów dla organizacji fiszek
- Import/eksport fiszek
- Monitorowanie postępów w nauce
- Zaawansowane logowanie działań użytkowników
- System backupu danych (poza podstawowym)
- Publiczne API
- Mechanizmy grywalizacji
- Rozbudowane powiadomienia
- Zaawansowane wyszukiwanie po treści fiszek

### Ograniczenia techniczne

- Maksymalnie 15 fiszek na użytkownika
- Czas generacji AI: maksymalnie 5 sekund
- Format fiszek: wyłącznie tekstowy
- Brak zaawansowanych funkcji analitycznych

## 5. Historyjki użytkowników

### US-001: Rejestracja nowego użytkownika

**Jako** nowy użytkownik  
**Chcę** zarejestrować się w systemie używając emaila i hasła  
**Aby** móc korzystać z aplikacji do tworzenia fiszek

**Kryteria akceptacji:**

- Użytkownik może wprowadzić email i hasło na stronie rejestracji
- System waliduje poprawność emaila
- System wymaga hasła o odpowiedniej sile
- Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany
- W przypadku błędu wyświetlany jest komunikat na czerwono

### US-002: Logowanie użytkownika

**Jako** zarejestrowany użytkownik  
**Chcę** zalogować się do systemu używając emaila i hasła  
**Aby** uzyskać dostęp do moich fiszek

**Kryteria akceptacji:**

- Użytkownik może wprowadzić email i hasło na stronie logowania
- System weryfikuje poprawność danych logowania
- Po pomyślnym logowaniu użytkownik jest przekierowany do głównej strony
- W przypadku niepoprawnych danych wyświetlany jest komunikat błędu na czerwono
- Użytkownik może wylogować się z systemu

### US-003: Generowanie fiszek przez AI

**Jako** zalogowany użytkownik  
**Chcę** wprowadzić tekst źródłowy i wygenerować fiszki przez AI  
**Aby** szybko stworzyć zestaw fiszek do nauki

**Kryteria akceptacji:**

- Użytkownik może wprowadzić tekst źródłowy w polu tekstowym
- System generuje fiszki w czasie maksymalnie 5 sekund
- Każda fiszka ma przód (max 200 znaków) i tył (max 500 znaków)
- Wygenerowane fiszki są wyświetlane do przeglądu
- Użytkownik może zatwierdzić lub odrzucić wygenerowane fiszki
- Odrzucone fiszki są usuwane z systemu
- W widoku generowania fiszek znajduje się pole tekstowe, w którym użytkownik może wkleić swój tekst.
- Pole tekstowe akceptuje od 1000 do 10 000 znaków.

### US-004: Manualne tworzenie fiszek

**Jako** zalogowany użytkownik  
**Chcę** ręcznie stworzyć fiszkę wprowadzając treść przodu i tyłu  
**Aby** mieć pełną kontrolę nad treścią fiszki

**Kryteria akceptacji:**

- Użytkownik może wprowadzić treść przodu fiszki (max 200 znaków)
- Użytkownik może wprowadzić treść tyłu fiszki (max 500 znaków)
- System wyświetla licznik znaków dla obu pól
- W przypadku przekroczenia limitu wyświetlany jest komunikat błędu na czerwono
- Po zatwierdzeniu fiszka jest zapisywana w systemie

### US-005: Przeglądanie fiszek

**Jako** zalogowany użytkownik  
**Chcę** przeglądać wszystkie moje fiszki  
**Aby** zobaczyć co mam do nauki

**Kryteria akceptacji:**

- Wszystkie fiszki użytkownika są wyświetlane na liście
- Fiszki mogą być wyświetlane w rzędach lub kolejno
- Każda fiszka pokazuje przód i tył
- System wyświetla liczbę fiszek użytkownika
- W przypadku przekroczenia limitu 15 fiszek wyświetlany jest komunikat

### US-006: Edycja fiszek

**Jako** zalogowany użytkownik  
**Chcę** edytować istniejące fiszki  
**Aby** poprawić lub zaktualizować ich treść

**Kryteria akceptacji:**

- Użytkownik może kliknąć przycisk "Edytuj" przy każdej fiszce
- System otwiera formularz edycji z aktualną treścią
- Użytkownik może modyfikować zarówno przód jak i tył fiszki
- System waliduje limity znaków podczas edycji
- Zmiany są zapisywane po zatwierdzeniu

### US-007: Usuwanie fiszek

### US-011: Przegląd i zatwierdzanie propozycji fiszek

**Jako** zalogowany użytkownik  
**Chcę** przejrzeć propozycje fiszek wygenerowane przez AI i zdecydować, które zapisać  
**Aby** zachować tylko wartościowe pozycje w mojej bazie

**Kryteria akceptacji:**

- Pod listą propozycji widoczne są przyciski Zatwierdź, Edytuj, Odrzuć dla każdej pozycji
- Zatwierdzone pozycje mogą zostać zapisane zbiorczo jednym kliknięciem
- Odrzucone propozycje nie są zapisywane
- Edycja propozycji przed zatwierdzeniem aktualizuje jej treść

### US-012: Usunięcie konta i danych

**Jako** zalogowany użytkownik  
**Chcę** trwale usunąć swoje konto wraz z wszystkimi fiszkami  
**Aby** mieć pełną kontrolę nad moimi danymi

**Kryteria akceptacji:**

- W ustawieniach konta dostępna jest akcja „Usuń konto”
- Przed usunięciem wyświetlane jest czytelne ostrzeżenie o konsekwencjach
- Po potwierdzeniu konto oraz wszystkie powiązane fiszki są trwale usuwane
- Po operacji użytkownik zostaje wylogowany i traci dostęp do danych
  **Jako** zalogowany użytkownik  
  **Chcę** usuwać niepotrzebne fiszki  
  **Aby** utrzymać porządek w mojej kolekcji

**Kryteria akceptacji:**

- Użytkownik może kliknąć przycisk "Usuń" przy każdej fiszce
- System wyświetla potwierdzenie usunięcia
- Po potwierdzeniu fiszka jest trwale usuwana z systemu
- Lista fiszek jest automatycznie odświeżana

### US-008: Sesja nauki z algorytmem powtórek

**Jako** zalogowany użytkownik  
**Chcę** korzystać z systemu powtórek  
**Aby** efektywnie się uczyć używając spaced repetition

**Kryteria akceptacji:**

- W widoku "Sesja nauki" algorytm przygotowuje dla mnie sesję nauki fiszek
- Na start wyświetlany jest przód fiszki, poprzez interakcję uzytkownik wyświetla jej tył
- Uzytkownik ocenia zgodnie z oczekiwaniami algorytmu na ile przyswoił fiszkę
- Następnie algorytm pokazuje kolejną fiszkę w ramach sesji nauki

### US-009: Obsługa błędów walidacji

**Jako** użytkownik  
**Chcę** otrzymywać jasne komunikaty o błędach  
**Aby** wiedzieć co poprawić w moich danych

**Kryteria akceptacji:**

- W przypadku przekroczenia limitu znaków wyświetlany jest komunikat na czerwono
- Komunikaty błędów są jasne i zrozumiałe
- Błędy są wyświetlane w czasie rzeczywistym podczas wprowadzania danych
- Po poprawieniu błędu komunikat znika

### US-010: Bezpieczeństwo danych

**Jako** użytkownik  
**Chcę** mieć pewność, że moje dane są bezpieczne  
**Aby** móc swobodnie korzystać z aplikacji

**Kryteria akceptacji:**

- Każdy użytkownik widzi tylko swoje fiszki
- Dane użytkowników są izolowane w systemie
- Hasła są bezpiecznie przechowywane (hashowane)
- Sesja użytkownika wygasa po okresie nieaktywności

## 6. Metryki sukcesu

### Kluczowe wskaźniki wydajności (KPI)

#### Jakość generowania AI

- **75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika**
  - Metryka: Liczba zatwierdzonych fiszek / Liczba wygenerowanych fiszek
  - Cel: ≥75%
  - Pomiar: Codziennie przez pierwsze 30 dni

#### Wykorzystanie AI

- **75% fiszek tworzonych z wykorzystaniem AI**
  - Metryka: Liczba fiszek wygenerowanych przez AI / Całkowita liczba fiszek
  - Cel: ≥75%
  - Pomiar: Tygodniowo

#### Wydajność systemu

- **Czas generacji fiszek**
  - Metryka: Średni czas generacji fiszek przez AI
  - Cel: ≤5 sekund
  - Pomiar: W czasie rzeczywistym

### Metryki pomocnicze

- Liczba fiszek na użytkownika (średnia)
- Częstotliwość edycji fiszek
- Wskaźnik błędów systemowych
- Satysfakcja użytkowników (jeśli dostępna)

### Sposób pomiaru

- Analiza logów generowania w bazie danych
- Monitoring wydajności aplikacji
- Analityka użytkowania (jeśli implementowana)
- Regularne przeglądy metryk (tygodniowe/miesięczne)
- Z logów: wyliczanie odsetka akceptacji (zatwierdzone / wygenerowane) oraz udziału fiszek AI w całości
