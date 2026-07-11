# Beta Fish Game

Klidna pixel-art desktopova simulace chovu fiktivnich akvarijnich ryb pro Windows.

## Spusteni bez instalace

1. Stahni ZIP s prenosnou verzi.
2. Rozbal ho do samostatne slozky.
3. Spust `Beta Fish Game.exe`.

Windows muze pri prvnim spusteni zobrazit upozorneni, protoze aplikace neni podepsana certifikatem.

## Vyvoj

Pozadavky: Node.js 18 nebo novejsi.

```powershell
npm install
npm start
```

Kontrola JavaScriptu:

```powershell
npm run check
```

Vytvoreni prenosne Windows verze:

```powershell
npm run build
```

## Struktura

- `prototype/` - hra, data, herni systemy a assety
- `electron/` - desktopove okno
- `docs/` - design dokumentace
- `scripts/` - priprava pixel-art assetu

## Ukladani

Hra uklada stav automaticky do lokalniho uloziste Electronu. Ulozena data nejsou soucasti repozitare ani prenosneho ZIPu.
