# Dossie do Cacador - Savage Worlds

Ficha digital para Savage Worlds Edicao de Aventura com tema de caderno/dossie sobrenatural.

## Como usar localmente

Abra `index.html` no navegador ou use `abrir-ficha.bat` no Windows.

A ficha salva automaticamente no proprio navegador usando `localStorage`. Voce tambem pode exportar/importar a ficha em JSON pelos botoes do topo.

## Publicar no GitHub Pages

Repositorio: https://github.com/netssu/savage-supernatural

Site publicado: https://netssu.github.io/savage-supernatural/

1. Envie estes arquivos para a branch `main`.
2. No repositorio, va em `Settings` -> `Pages`.
3. Em `Build and deployment`, escolha `GitHub Actions`.
4. Faca um push para `main`. O workflow `Deploy GitHub Pages` publicara o site automaticamente.

Depois do deploy, a URL aparece na propria pagina de `Settings` -> `Pages` e tambem no resumo da Action.

## Estrutura

- `index.html`: estrutura da ficha.
- `styles.css`: visual de caderno e layout responsivo.
- `app.js`: autosave, abas, exportacao/importacao e listas dinamicas.
- `assets/`: textura do papel e carimbo.
- `.github/workflows/pages.yml`: deploy automatico para GitHub Pages.

## Observacao

Os dados salvos ficam no navegador/dispositivo usado para acessar o site. Para mover uma ficha entre navegadores ou computadores, use o botao de exportar/importar JSON.
