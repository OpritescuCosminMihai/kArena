# kArena

Site de turnee pentru prieteni: bracket live, Pick'em, statistici și acces pe bază de aprobare.
Construit cu Vite + React, cu Firebase pentru login (Google), baza de date și găzduire.

## Prima dată pe un calculator

```
npm install
```

Copiază `.env.example` ca `.env.local` și pune în el cheia web Firebase
(Google Cloud Console → APIs & Services → Credentials). `.env.local` nu se urcă pe GitHub.

## Publicare

```
npm run deploy
```

Comanda construiește site-ul (în folderul `dist`) și îl urcă pe https://khaled-arena.web.app,
împreună cu regulile de securitate din `firestore.rules`.

## Lucru local

- `npm run dev` pornește site-ul pe calculatorul tău, legat de baza de date reală.

## Roluri

| Rol | Cine | Ce poate |
| --- | --- | --- |
| Admin | contul din `firestore.rules` | aprobă accesul, dă drept de creare, poate șterge orice turneu |
| Creator | membru căruia adminul i-a dat drept de creare | creează turnee și le gestionează doar pe ale lui |
| Membru | aprobat de admin | vede tot, se înscrie, votează la Pick'em, își alege porecla |
| Vizitator | oricine altcineva | vede doar pagina de prezentare |

Turneele create înainte de versiunea 2 îi aparțin adminului.

## Structura

```
src/
  firebase.js        conexiunea Firebase
  lib/engine.js      logica turneelor: bracket, clasamente, Pick'em, statistici (fără React)
  state/             cine e logat (session), datele live (data), notificări (toast)
  components/        bracket, carduri de meci, tabele, ferestre de rezultat și poreclă
  pages/             o pagină pentru fiecare adresă din site
firestore.rules      cine are voie să citească și să scrie, verificat pe serverul Google
```
