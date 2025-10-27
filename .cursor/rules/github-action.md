---
description: Zasady GitHub Actions dla zapewnienia jakości i niezawodności.
globs: 
alwaysApply: false
---

## Zasady GitHub Actions

Poniżej przedstawiono kroki zapewniające niezawodność i wysoką jakość workflow.

### Weryfikacja wersji

1. Przeskanuj plik workflow i znajdź używane akcje publiczne.
2. Dla każdej akcji użyj narzędzia terminala do zweryfikowania najnowszej wersji, wykonując poniższe polecenie:

```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

3. Zaktualizuj skrypt GitHub Actions tylko przez zastosowanie numeru głównej wersji.

### Instalowanie zależności

1. Preferuj `npm ci` zamiast `npm install` dla zapewnienia zgodności z plikiem lockfile.

### Setup Node

1. Sprawdź, czy w korzeniu projektu istnieje plik `.nvmrc`.
2. Jeśli istnieje, zaktualizuj workflow CI/CD, dodając `node-version-file: '.nvmrc'` do setup-node.

### Triggery Workflow

1. Upewnij się, że właściwa gałąź domyślna (main lub master) jest używana, sprawdzając aktualną konfigurację `git`.
