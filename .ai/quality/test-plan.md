# Kompleksowy Plan Testów dla Aplikacji "SuperFiszek"

## 1. Wprowadzenie i Cele Testowania
### 1.1. Wprowadzenie
Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji webowej "SuperFiszek", platformy do nauki opartej na fiszkach, z kluczową funkcjonalnością generowania treści przy użyciu sztucznej inteligencji. Aplikacja zbudowana jest w oparciu o framework Astro z interaktywnymi komponentami React, wykorzystuje Supabase do autentykacji i przechowywania danych oraz integruje się z zewnętrznym API (OpenRouter) do generowania treści AI.

### 1.2. Cele Testowania
Głównym celem procesu testowania jest zapewnienie najwyższej jakości, niezawodności i bezpieczeństwa aplikacji przed jej wdrożeniem produkcyjnym. Cele szczegółowe to:
- **Weryfikacja funkcjonalna**: Upewnienie się, że wszystkie kluczowe funkcje (autentykacja, generowanie AI, zarządzanie fiszkami) działają zgodnie ze specyfikacją.
- **Zapewnienie stabilności**: Identyfikacja i eliminacja błędów, które mogłyby prowadzić do awarii aplikacji lub utraty danych.
- **Walidacja integracji**: Sprawdzenie poprawnej komunikacji między frontendem, backendem (Astro API Routes) oraz usługami zewnętrznymi (Supabase, OpenRouter).
- **Ocena User Experience (UX)**: Zapewnienie, że interfejs jest intuicyjny, responsywny i działa płynnie na różnych urządzeniach i przeglądarkach.
- **Weryfikacja bezpieczeństwa**: Potwierdzenie, że dane użytkowników są chronione, a aplikacja jest odporna na podstawowe ataki.
- **Osiągnięcie pokrycia kodu**: Zapewnienie, że krytyczna logika biznesowa jest pokryta testami automatycznymi.

## 2. Zakres Testów
### 2.1. Funkcjonalności objęte testami
Testy obejmą wszystkie aspekty aplikacji dostępne dla użytkownika końcowego oraz logikę po stronie serwera (BFF).

- **Moduł Uwierzytelniania i Autoryzacji**:
  - Rejestracja nowego użytkownika (z potwierdzeniem e-mail i bez).
  - Logowanie i wylogowywanie.
  - Proces odzyskiwania i resetowania hasła.
  - Zarządzanie sesją użytkownika (ciasteczka, odświeżanie tokenów).
  - Ochrona tras wymagających zalogowania (/generate, /flashcards).

- **Moduł Generowania Fiszki z AI**:
  - Formularz wprowadzania tekstu źródłowego (walidacja długości tekstu, ustawienia generacji).
  - Proces inicjowania generacji i obsługa stanu ładowania (polling).
  - Wyświetlanie propozycji fiszek po pomyślnym zakończeniu generacji.
  - Interakcje z propozycjami: akceptacja, edycja, odrzucenie.
  - Proces zapisu (commit) zaakceptowanych fiszek.
  - Obsługa błędów (np. timeout, błąd API AI, przekroczenie limitów).

- **Moduł Zarządzania Fiszami (CRUD)**:
  - Wyświetlanie listy istniejących fiszek użytkownika.
  - Tworzenie nowej fiszki ręcznie.
  - Edycja treści istniejącej fiszki.
  - Usuwanie fiszki.
  - Walidacja formularzy (limity znaków).
  - Obsługa limitu 15 fiszek na użytkownika.

- **Ogólny Interfejs Użytkownika (UI/UX)**:
  - Responsywność (RWD) na urządzeniach mobilnych, tabletach i desktopach.
  - Dostępność (a11y) – podstawowa weryfikacja nawigacji klawiaturą i kontrastu.
  - Spójność wizualna i działanie komponentów UI.

### 2.2. Funkcjonalności wyłączone z testów
- Testy wydajnościowe i penetracyjne usług zewnętrznych (Supabase, OpenRouter).
- Testowanie infrastruktury chmurowej (np. konfiguracja serwerów Supabase).
- Testy wewnętrznych mechanizmów frameworka Astro i biblioteki React.
- Szczegółowa analiza jakościowa treści generowanych przez modele AI (skupiamy się na procesie, nie na wyniku merytorycznym AI).

## 3. Typy Testów do Przeprowadzenia
Strategia testowania będzie oparta na piramidzie testów, aby zapewnić efektywność i szybkość informacji zwrotnej.

| Typ Testu | Opis | Zastosowanie w Projekcie |
|------------|------|---------------------------|
| **Testy Jednostkowe (Unit Tests)** | Testowanie pojedynczych funkcji, komponentów lub modułów w izolacji od reszty systemu. Szybkie i tanie w utrzymaniu. | - Funkcje pomocnicze (lib/utils, lib/utils/validation).<br>- Walidatory Zod (lib/validators).<br>- Komponenty React w izolacji z mockowaniem hooków i propsów.<br>- Logika hooka useAiGeneration z mockowaniem API. |
| **Testy Integracyjne (Integration Tests)** | Weryfikacja interakcji pomiędzy kilkoma modułami. Sprawdzają, czy połączone komponenty działają razem poprawnie. | - Testowanie endpointów Astro API (BFF) w izolacji, mockując usługi (np. aiGenerationsService).<br>- Testowanie komponentów, które wywołują hooki i API, weryfikując przepływ danych.<br>- Sprawdzanie integracji aiGenerationsService z klientem Supabase (mockowanym). |
| **Testy End-to-End (E2E)** | Symulowanie pełnych scenariuszy użytkownika w przeglądarce, od logowania po wygenerowanie i zapisanie fiszek. Najwolniejsze, ale dające największą pewność co do działania całości. | - Pełny cykl życia użytkownika: Rejestracja -> Logowanie -> Generowanie fiszek -> Edycja propozycji -> Zapis -> Weryfikacja na liście fiszek -> Wylogowanie.<br>- Proces odzyskiwania hasła.<br>- Scenariusze błędów (np. próba dostępu do chronionej strony bez logowania). |
| **Testy Regresji Wizualnej** | Automatyczne porównywanie zrzutów ekranu interfejsu użytkownika z wersją bazową w celu wykrycia niezamierzonych zmian wizualnych. | - Testowanie kluczowych widoków (/, /login, /generate, /flashcards) na różnych rozdzielczościach w celu zapewnienia spójności wizualnej po zmianach w stylach. |
| **Testy Manualne (Eksploracyjne)** | Ręczne testowanie aplikacji w celu znalezienia błędów, które trudno jest zautomatyzować. Skupia się na użyteczności, UX i nietypowych scenariuszach. | - Ocena ogólnej płynności i intuicyjności interfejsu.<br>- Testowanie na różnych przeglądarkach i urządzeniach fizycznych.<br>- Weryfikacja scenariuszy trudnych do zautomatyzowania (np. przerwanie połączenia sieciowego w trakcie operacji). |

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności
### 4.1. Moduł Uwierzytelniania
| ID | Scenariusz | Kroki Testowe | Oczekiwany Rezultat | Priorytet |
|-----|------------|--------------|---------------------|-----------|
| **AUTH-01** | Pomyślna rejestracja nowego użytkownika | 1. Przejdź do /register.<br>2. Wypełnij poprawnie formularz.<br>3. Kliknij "Załóż konto". | Użytkownik widzi komunikat o sukcesie (np. o konieczności weryfikacji e-mail) i/lub jest przekierowany do /generate. | Krytyczny |
| **AUTH-02** | Pomyślne logowanie | 1. Przejdź do /login.<br>2. Wprowadź prawidłowe dane uwierzytelniające.<br>3. Kliknij "Zaloguj się". | Użytkownik zostaje przekierowany do /generate, a jego e-mail jest widoczny w komponencie AuthStatus. | Krytyczny |
| **AUTH-03** | Nieudane logowanie (błędne hasło) | 1. Przejdź do /login.<br>2. Wprowadź poprawny e-mail i błędne hasło.<br>3. Kliknij "Zaloguj się". | Formularz wyświetla czytelny komunikat o błędzie. Użytkownik pozostaje na stronie logowania. | Wysoki |
| **AUTH-04** | Dostęp do chronionej trasy (bez logowania) | 1. Otwórz przeglądarkę w trybie incognito.<br>2. Spróbuj przejść bezpośrednio do /generate. | Użytkownik zostaje przekierowany na stronę /login. | Krytyczny |
| **AUTH-05** | Pomyślne wylogowanie | 1. Będąc zalogowanym, kliknij przycisk "Wyloguj". | Użytkownik zostaje przekierowany na stronę główną (/), a w nagłówku pojawiają się przyciski "Zaloguj się" i "Dołącz". | Wysoki |
| **AUTH-06** | Pomyślny reset hasła | 1. Przejdź do /forgot-password.<br>2. Podaj e-mail.<br>3. Otwórz link z e-maila.<br>4. Ustaw nowe hasło. <br>5. Zaloguj się nowym hasłem. | Cały proces przebiega pomyślnie, logowanie nowym hasłem kończy się sukcesem. | Wysoki |

### 4.2. Moduł Generowania Fiszki z AI
| ID | Scenariusz | Kroki Testowe | Oczekiwany Rezultat | Priorytet |
|-----|------------|--------------|---------------------|-----------|
| **GEN-01** | Pomyślne wygenerowanie i zapisanie fiszek (Happy Path) | 1. Zaloguj się i przejdź do /generate.<br>2. Wklej poprawny tekst (1000-10000 znaków).<br>3. Kliknij "Generuj fiszki".<br>4. Poczekaj na zakończenie procesu.<br>5. Zaznacz kilka propozycji.<br>6. Kliknij "Zapisz zaznaczone". | Proces generowania kończy się sukcesem, wyświetlają się propozycje. Po zapisie użytkownik widzi komunikat o sukcesie, a zapisane fiszki są widoczne na stronie /flashcards. | Krytyczny |
| **GEN-02** | Walidacja formularza generowania (tekst za krótki) | 1. Przejdź do /generate.<br>2. Wklej tekst o długości < 1000 znaków.<br>3. Spróbuj kliknąć "Generuj fiszki". | Przycisk jest nieaktywny, a pod polem tekstowym widoczny jest komunikat o błędzie walidacji. | Wysoki |
| **GEN-03** | Edycja propozycji przed zapisem | 1. Po wygenerowaniu propozycji, zmodyfikuj treść jednej z nich.<br>2. Zaznacz edytowaną propozycję.<br>3. Zapisz zaznaczone. | Zapisana fiszka na liście /flashcards zawiera zmodyfikowaną treść. | Średni |
| **GEN-04** | Obsługa błędu timeout podczas generowania | 1. (Symulacja w teście E2E) Spraw, aby endpoint /api/ai-generations/[id] nigdy nie zwrócił statusu success.<br>2. Rozpocznij generowanie. | Po upływie 5 sekund (timeout) interfejs użytkownika wyświetla komunikat o błędzie i pozwala spróbować ponownie. | Wysoki |
| **GEN-05** | Próba generacji przy pełnym limicie fiszek (15) | 1. (Setup) Upewnij się, że użytkownik ma już 15 fiszek.<br>2. Przejdź do /generate i spróbuj rozpocząć generowanie. | Aplikacja zwraca błąd (z API), informując o osiągnięciu limitu fiszek. Proces generowania nie rozpoczyna się. | Wysoki |

### 4.3. Moduł Zarządzania Fiszami (CRUD)
| ID | Scenariusz | Kroki Testowe | Oczekiwany Rezultat | Priorytet |
|-----|------------|--------------|---------------------|-----------|
| **CRUD-01** | Pomyślne utworzenie fiszki ręcznie | 1. Przejdź do /generate.<br>2. W sekcji "Utwórz fiszkę ręcznie" wypełnij poprawnie pola "Przód" i "Tył".<br>3. Kliknij "Dodaj fiszkę". | Fiszka zostaje utworzona, formularz się czyści, a nowa fiszka jest widoczna na liście w /flashcards. | Wysoki |
| **CRUD-02** | Pomyślna edycja fiszki | 1. Przejdź do /flashcards.<br>2. Przy dowolnej fiszce kliknij "Edytuj".<br>3. Zmień treść i kliknij "Zapisz". | Treść fiszki zostaje zaktualizowana, a widok edycji jest zamykany. | Wysoki |
| **CRUD-03** | Pomyślne usunięcie fiszki | 1. Przejdź do /flashcards.<br>2. Przy dowolnej fiszce kliknij "Usuń".<br>3. Potwierdź operację (jeśli wymagane). | Fiszka znika z listy, pojawia się komunikat o pomyślnym usunięciu. | Wysoki |
| **CRUD-04** | Walidacja formularza edycji fiszki | 1. Przejdź do /flashcards i wejdź w tryb edycji.<br>2. Usuń całą treść z pola "Przód", aby miała mniej niż 10 znaków.<br>3. Spróbuj zapisać. | Przycisk zapisu jest nieaktywny lub po kliknięciu pojawia się komunikat o błędzie walidacji. | Średni |
| **CRUD-05** | Odwracanie fiszki (flip) | 1. Przejdź do /flashcards.<br>2. Kliknij na treść dowolnej fiszki. | Fiszka odwraca się, pokazując drugą stronę (z "Przodu" na "Tył" i odwrotnie). | Średni |

## 5. Środowisko Testowe
- **Środowisko deweloperskie lokalne**: Używane do uruchamiania testów jednostkowych i integracyjnych podczas developmentu.
- **Środowisko Staging/Testowe**:
  - Osobna, dedykowana instancja projektu Supabase z wyczyszczoną bazą danych i predefiniowanymi użytkownikami testowymi.
  - Zmienne środowiskowe (.env) skonfigurowane specjalnie dla tego środowiska.
  - Klucze API do OpenRouter dla środowiska testowego (lub w pełni mockowane API).
  - Wdrożenie na platformie typu Vercel/Netlify w celu uruchamiania testów E2E w środowisku zbliżonym do produkcyjnego.

- **Przeglądarki docelowe**:
  - Chrome (najnowsza wersja) - główna przeglądarka do testów automatycznych.
  - Firefox (najnowsza wersja) - weryfikacja manualna.
  - Safari (najnowsza wersja) - weryfikacja manualna.
  - Chrome Mobile (emulator) - dla testów RWD.

## 6. Narzędzia do Testowania
| Kategoria | Narzędzie | Zastosowanie |
|-----------|-----------|-------------|
| **Test Runner / Framework** | Vitest | Do uruchamiania testów jednostkowych i integracyjnych w środowisku Node.js. Zgodność z API Jest, co ułatwia pisanie testów. |
| **Testowanie Komponentów** | React Testing Library | Do renderowania komponentów React w środowisku testowym i symulowania interakcji użytkownika w sposób, w jaki robiłby to prawdziwy użytkownik (bez testowania detali implementacji). |
| **Testy E2E** | Playwright lub Cypress | Do automatyzacji przeglądarki i wykonywania pełnych scenariuszy użytkownika. Playwright jest preferowany ze względu na szybkość i wsparcie dla wielu przeglądarek. |
| **Testy Regresji Wizualnej** | Integracja Playwright lub Storybook | Do tworzenia zrzutów ekranu komponentów i całych stron w celu automatycznego wykrywania zmian w UI. |
| **Mockowanie API** | Mock Service Worker (MSW) / Vitest Mocks | Do przechwytywania i mockowania żądań sieciowych (do Supabase i OpenRouter) na potrzeby testów jednostkowych i integracyjnych, co zapewnia stabilność i niezależność testów. |
| **CI/CD** | GitHub Actions | Do automatycznego uruchamiania testów (jednostkowych, integracyjnych, E2E) po każdym pushu do repozytorium oraz przed każdym wdrożeniem. |
| **Śledzenie Błędów** | GitHub Issues lub Jira | Do raportowania, śledzenia i zarządzania cyklem życia znalezionych błędów. |

## 7. Harmonogram Testów
Proces testowania będzie prowadzony równolegle z procesem deweloperskim (Shift-left testing).
- **Testy jednostkowe i integracyjne**: Pisane przez deweloperów na bieżąco, wraz z nowymi funkcjonalnościami. Muszą być "zielone" przed mergem do głównej gałęzi.
- **Testy E2E**: Uruchamiane automatycznie w ramach pipeline'u CI/CD przed każdym wdrożeniem na środowisko stagingowe.
- **Testy manualne (eksploracyjne)**: Przeprowadzane cyklicznie, co 1-2 tygodnie, na środowisku stagingowym, po wdrożeniu większego zestawu zmian.
- **Pełna regresja (automatyczna i manualna)**: Przed każdym wdrożeniem produkcyjnym.

## 8. Kryteria Akceptacji Testów
### 8.1. Kryteria wejścia (rozpoczęcia testów)
- Funkcjonalność została zaimplementowana i wdrożona na środowisku testowym.
- Testy jednostkowe i integracyjne dla danej funkcjonalności przechodzą pomyślnie.
- Środowisko testowe jest stabilne i dostępne.

### 8.2. Kryteria wyjścia (zakończenia testów i wdrożenia)
- 100% testów E2E dla krytycznych ścieżek (Happy Path) przechodzi pomyślnie.
- Brak otwartych błędów krytycznych (Blocker) i wysokich (Critical). Błędy o niższym priorytecie mogą zostać zaakceptowane do naprawy w kolejnych iteracjach.
- Pokrycie kodu testami jednostkowymi i integracyjnymi dla logiki biznesowej (services, validators, hooks) wynosi co najmniej 80%.
- Wszystkie zidentyfikowane problemy z regresji wizualnej zostały przeanalizowane i zaakceptowane lub naprawione.
- Protokół z testów manualnych został podpisany przez zespół QA.

## 9. Role i Odpowiedzialności
| Rola | Odpowiedzialność |
|-------|-------------------|
| **Deweloperzy** | - Pisanie testów jednostkowych i integracyjnych dla tworzonego kodu.<br>- Utrzymywanie i aktualizacja istniejących testów.<br>- Naprawa błędów zgłoszonych przez zespół QA.<br>- Wsparcie w konfiguracji środowiska testowego. |
| **Inżynier QA** | - Tworzenie i utrzymanie tego planu testów.<br>- Projektowanie i implementacja automatycznych testów E2E.<br>- Przeprowadzanie testów manualnych i eksploracyjnych.<br>- Raportowanie i weryfikacja błędów.<br>- Ostateczna akceptacja jakości przed wdrożeniem. |
| **Product Owner / Manager** | - Definiowanie priorytetów dla testowanych funkcjonalności.<br>- Podejmowanie decyzji o akceptacji ryzyka związanego z istniejącymi błędami o niskim priorytecie. |

## 10. Procedury Raportowania Błędów
Każdy zidentyfikowany błąd musi zostać zaraportowany w systemie śledzenia błędów (np. Jira) i powinien zawierać następujące informacje:
- **Tytuł**: Krótki, zwięzły opis problemu.
- **Środowisko**: Gdzie błąd wystąpił (np. Lokalnie, Staging; Przeglądarka, Wersja).
- **Kroki do odtworzenia (Steps to Reproduce)**: Numerowana lista kroków pozwalająca jednoznacznie odtworzyć błąd.
- **Obserwowany rezultat (Actual Result)**: Co się stało po wykonaniu kroków.
- **Oczekiwany rezultat (Expected Result)**: Co powinno się stać.
- **Priorytet**: (np. Blocker, Critical, Major, Minor) - ocena wpływu błędu na działanie aplikacji.
- **Załączniki**: Zrzuty ekranu, nagrania wideo, logi z konsoli, które pomogą w diagnozie problemu.
- **Przypisana osoba**: Początkowo lider zespołu technicznego, który deleguje zadanie do odpowiedniego dewelopera.
- **Cykl życia błędu**: New -> In Progress -> Ready for QA -> Verified -> Closed (lub Reopened, jeśli błąd nadal występuje).
