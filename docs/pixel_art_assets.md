# Pixel art assety pro ryby

## Kam soubory davat

PNG soubory patri sem:

```text
prototype/assets/fish/
```

Hra je zkusi nacist automaticky. Kdyz soubory chybi, pouzije soucasnou procedurální grafiku jako fallback.

## Format souboru

- format: PNG s pruhlednym pozadim
- styl: pixel art
- velikost jednoho framu: 96 x 64 px
- pocet framu v souboru: 4
- celkova velikost jednoho spritesheetu: 384 x 64 px
- frame 1 je vlevo, frame 4 vpravo
- ryba v assetu kouka doprava
- stred tela je kolem bodu 48 x 32
- ocas je vlevo, hlava vpravo
- nepouzivat rozmazane hrany
- nepouzivat anti-aliasing
- exportovat s nearest-neighbor/pixel-perfect nastavenim

## Pojmenovani souboru

Zakladni telo:

```text
body_slender.png
body_round.png
body_deep.png
```

Ocasy:

```text
tail_short.png
tail_fork.png
tail_veil.png
```

Ploutve:

```text
fins_normal.png
fins_clamped.png
```

Vzory:

```text
pattern_spots.png
pattern_stripe.png
pattern_glow.png
```

Projevy nemoci a potizi:

```text
symptom_white_spots.png
symptom_pale_gills.png
symptom_cloudy_eye.png
symptom_scratching.png
symptom_fast_breathing.png
```

## Jak vrstvy fungují

Ryba se sklada z vrstev:

```text
telo
ocas
ploutve
vzor
projevy nemoci
```

Vsechny vrstvy jednoho druhu musi sedet na stejnou pozici. Kazdy PNG soubor ma stejne rozmery a stejne framy.

Vzory a projevy nemoci hra orezava podle siluety tela aktualni ryby. Pattern tedy muze byt nakresleny trochu sirsi, ale nesmi zasahovat do hlavy/oka zpusobem, ktery by po orezani vypadal divne.

Priklad ryby:

```text
body_deep.png
tail_veil.png
fins_normal.png
pattern_glow.png
symptom_white_spots.png
```

## Animacni framy

Soubor ma 4 framy:

1. neutralni poloha
2. ocas lehce nahoru
3. neutralni poloha nebo mirny protipohyb
4. ocas lehce dolu

Doporuceni:

- telo se hybe jen minimalne
- ocas a ploutve nesou vetsinu animace
- oko zustava stabilni
- vzory musi sedet na telo ve vsech framech
- nemocenske vrstvy kopiruji pohyb tela

## Ocasy

Ryba kouka doprava.

```text
hlava -> vpravo
ocas -> vlevo
```

Ocas musi navazovat na telo kolem bodu x 20 az 24 ve framu. Nemel by zacinat daleko od tela. Konec ocasu muze jit doleva az ke kraji framu, ale nemel by byt useknuty.

## Palety

Assety mohou byt bud plne barevne, nebo maskove.

Plne barevne PNG:

- hra ho neprebarvi
- zachova presny pixel art
- vhodne pro prvni rucni assety

Maskove PNG pro prebarveni:

- pouzij presne sede barvy
- hra je nahradi paletou ryby

Mapovani masek:

```text
#404040 nebo #303030 -> stin
#808080 nebo #A0A0A0 -> hlavni barva
#C0C0C0 nebo #E0E0E0 -> svetly hrbet / highlight
```

Jine barvy zustanou beze zmeny.

Kdyz PNG neobsahuje maskove sede barvy, hra pouzije automaticke prebarveni podle jasu pixelu. Zachova svetla a stiny, ale posune barevne pixely smerem k palete ryby. Neutralni sede detaily zustanou beze zmeny.

Pro nejlepsi vysledek jsou stale lepsi maskove PNG. Automaticke prebarveni je vhodne pro rychly prototyp.

Pracovni doporuceni:

- telo: hlavni barva, stin, svetly hřbet
- ocas: o neco tmavsi nez telo
- vzor: kontrastni, ale ne stejny jako bile tecky nemoci
- bile tecky nemoci: male svetle body, ostre a nepravidelne

## Co nemichat

Skvrnity vzor ryby a krupicka musi vypadat jinak.

Skvrnity vzor:

- vetsi barevne mapy
- barva souvisi s paletou ryby
- pusobi jako kresba na tele

Bila krupicka:

- male svetle body
- nepravidelne po tele
- v rozpuku je bodu hodne
- pusobi jako zdravotni projev

## Minimalni prvni sada

Pro prvni test PNG assetu staci:

```text
body_deep.png
tail_veil.png
fins_normal.png
pattern_glow.png
```

Tahle sada se projevi hlavne na Hlubince.

Pro vsechny aktualni ryby je potreba:

```text
body_slender.png
body_round.png
body_deep.png
tail_short.png
tail_fork.png
tail_veil.png
fins_normal.png
fins_clamped.png
pattern_spots.png
pattern_stripe.png
pattern_glow.png
```
