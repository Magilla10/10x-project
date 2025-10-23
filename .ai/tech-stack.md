Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:

- Dostęp do szerokiej gamy modeli, które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta

Testowanie - Kompleksowa strategia zapewniająca jakość kodu:

- Vitest jako test runner dla testów jednostkowych i integracyjnych (kompatybilny z API Jest, szybki)
- React Testing Library do testowania komponentów React bez testowania szczegółów implementacji
- Playwright do automatycznych testów End-to-End symulujących pełne scenariusze użytkownika w przeglądarce
- Mock Service Worker (MSW) do mockowania żądań sieciowych w testach (Supabase, OpenRouter)
- Integracja testów wizualnych (Playwright) do wykrywania niezamierzonych zmian w UI
- Cel: minimum 80% pokrycia kodu testami dla logiki biznesowej

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD z automatycznym uruchamianiem testów
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
