# Diagram Architektury UI - 10x-cards (Autentykacja + Flashcards)

Ten diagram wizualizuje strukturę UI na podstawie specyfikacji auth-spec.md i PRD prd.md. Pokazuje strony Astro, komponenty React, przepływ autentykacji i integrację z modułem flashcards. Zweryfikowany wobec codebase (komponenty w auth/generation/flashcards, API checks, middleware protection).

```mermaid
%%{init: {'theme':'neutral', 'themeVariables': { 'fontSize': '14px', 'primaryBorderColor': '#000', 'primaryTextColor': '#333', 'primaryColor': '#f9f9f9', 'lineColor': '#333'}}}%%
flowchart LR
    %% Komentarze na górze dla czytelności
    %% Diagram architektury UI: Autentykacja + Flashcards w 10x-cards
    %% Zaktualizowana struktura po wdrożeniu auth (z auth-spec.md i prd.md)

    subgraph "Moduł Autentykacji"
        A["Auth Pages<br/>(login, register, forgot, reset)"]
        B["Layout.astro<br/>(AuthStatus w navbar)"]
        C["AuthLayout.astro<br/>(centrowany)"]
        D["Middleware<br/>(sesja, ochrona)"]
        E["Supabase Client"]
    end

    subgraph "React - Autentykacja"
        F["LoginForm<br/>(signIn)"]
        G["RegisterForm<br/>(signUp)"]
        H["ForgotForm<br/>(reset email)"]
        I["ResetForm<br/>(zmiana hasła)"]
        J["AuthStatus<br/>(signOut)"]
    end

    subgraph "Moduł Flashcards"
        K["flashcards.astro<br/>(lista fiszek)"]
        L["generate.astro<br/>(AI generowanie)"]
    end

    subgraph "React - Flashcards"
        M["FlashcardsList<br/>(wyświetl/edytuj)"]
    end

    subgraph "React - Generation"
        N["ManualForm<br/>(ręczne tworzenie)"]
        O["Proposals<br/>(akceptacja via commit)"]
    end

    subgraph "API i Serwisy"
        P["API: flashcards<br/>(CRUD user.id)"]
        Q["API: ai-generations<br/>(generowanie)"]
        R["Serwisy<br/>(flashcards, ai)"]
        S["Baza Supabase<br/>(profiles, RLS)"]
    end

    %% Definicja węzła użytkownika
    U["Użytkownik"]

    %% Przepływ autentykacji (uproszczony)
    U --> A
    A --> F
    A --> G
    A --> H
    A --> I
    F --> E
    G --> E
    H --> E
    I --> E
    E -.-> D
    D --> B
    B --> J
    J -.-> E

    %% Ochrona i integracja (grupowane)
    D -.->|chroni| K
    D -.->|chroni| L
    K --> M
    L --> N
    L --> O
    M --> P
    N --> P
    O --> Q
    Q -.-> P
    P --> R
    Q --> R
    R --> S

    %% Przepływ sesji (mniej linii)
    E -->|sesja/cookies| D
    D -->|user| P
    D -->|user| Q
    J -->|wyloguj| E

    %% Stylizacja (grubsze linie, lepsze kolory)
    classDef authComponent fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef flashcardComponent fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef generationComponent fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef apiComponent fill:#fff3e0,stroke:#e65100,stroke-width:3px

    class F,G,H,I,J authComponent
    class M flashcardComponent
    class N,O generationComponent
    class P,Q,R apiComponent
    class A,B,C,D,L,K,L updatedComponent
```

## Wyjaśnienie
- **Moduł Autentykacji**: Flow logowania/rejestracji z Supabase.
- **Moduł Flashcards**: Integracja chronionych stron (wymaga auth).
- **React - Generation**: Komponenty z generation/ (ManualForm, Proposals z akceptacją via commit API).
- **Przepływ**: Strzałki pokazują kierunek (sesja via cookies do middleware; proposals commit -> flashcards).
- **Kolory**: Autentykacja (niebieski), Flashcards (fioletowy), Generation (zielony), API (pomarańczowy), zaktualizowane (różowy).

Diagram jest w języku polskim, zgrupowany wg funkcjonalności i pokazuje zależności auth-flashcards. Poprawiona czytelność: układ poziomy, krótsze etykiety, większe czcionki. Zweryfikowany: grupowanie zgodne z codebase (generation/ osobno).