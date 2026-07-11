# Zadani pro tvorbu PNG pixel art assetu ryb

Tento dokument je urceny jako presne zadani pro ChatGPT nebo jiny nastroj, ktery ma vytvorit PNG assety pro hru.

## Vystup

Vytvor samostatne PNG soubory podle seznamu nize.

Kazdy soubor:

- PNG s pruhlednym pozadim
- pixel art, ostre hrany
- bez anti-aliasingu
- bez stinu mimo rybu
- bez pozadi
- bez textu
- bez ramecku
- velikost souboru: 384 x 64 px
- 4 animacni framy vedle sebe
- jeden frame: 96 x 64 px
- ryba ve vsech framech kouka doprava
- hlava je vzdy vpravo
- ocas je vzdy vlevo
- telo je centrovane kolem bodu x 48, y 32 v kazdem framu

## Animace

Kazdy spritesheet ma 4 framy:

1. neutralni poloha
2. ocas a ploutve lehce nahoru
3. neutralni nebo mirny protipohyb
4. ocas a ploutve lehce dolu

Telo se hybe jen malo. Ocas a ploutve nesou vetsinu pohybu.

## Dulezite pravidlo orientace

Ryba kouka doprava.

```text
ocas vlevo  <--- telo --->  hlava vpravo
```

Ocas musi byt pripojeny k zadni casti tela vlevo. Nesmí vypadat jako hlava, vousy, cepice, vlajka nebo ploutev smerujici dopredu.

## Pocet souboru

Minimalni komplet pro aktualni prototyp ma 16 PNG souboru:

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
symptom_white_spots.png
symptom_pale_gills.png
symptom_cloudy_eye.png
symptom_scratching.png
symptom_fast_breathing.png
```

Soubory ulozit do:

```text
prototype/assets/fish/
```

## Co ma byt v jednotlivych PNG

### body_slender.png

Stihle telo male hejnovite ryby.

Obsahuje:

- telo bez ocasu
- hlavu vpravo
- oko muze byt soucasti tela jen pokud zustane ve vsech telech stejne umistene
- jemny svetly hrbet
- tmavsi bricho

Neobsahuje:

- ocas
- samostatne ploutve
- vzory
- nemoc
- pozadi

### body_round.png

Kulatejsi telo odolne male ryby.

Obsahuje:

- telo bez ocasu
- hlavu vpravo
- trochu plnejsi bricho
- svetly hrbet
- tmavsi spodni cast

Neobsahuje:

- ocas
- samostatne ploutve
- vzory
- nemoc
- pozadi

### body_deep.png

Vyssi hlubsi telo tajemnejsi ryby.

Obsahuje:

- vyssi telo bez ocasu
- hlavu vpravo
- trochu tmavsi a tezsi siluetu
- misto pro napojeni ocasu vlevo

Neobsahuje:

- ocas
- samostatne ploutve
- vzory
- nemoc
- pozadi

### tail_short.png

Kratky bezny ocas.

Obsahuje:

- pouze ocas
- napojeni na telo vlevo od stredu, kolem x 20 az 24 v kazdem framu
- ocas se rozsiruje doleva od tela
- 4 framy s jemnym pohybem

Neobsahuje:

- telo
- hlavu
- oko
- vzory na tele
- nemoc

### tail_fork.png

Rozeklany ocas.

Obsahuje:

- pouze ocas
- horni a dolni cipek
- viditelny zarez mezi cipky
- napojeni na telo kolem x 20 az 24
- ocas se rozsiruje doleva

Neobsahuje:

- telo
- hlavu
- oko
- nemoc

### tail_veil.png

Delsi zavojovy ocas.

Obsahuje:

- pouze ocas
- mekky siroky tvar
- napojeni na telo kolem x 20 az 24
- ocas jde doleva a mirne nahoru/dolu podle framu
- nesmi byt moc dlouhy pres pulku celeho frame

Neobsahuje:

- telo
- hlavu
- oko
- nemoc

### fins_normal.png

Bezné ploutve.

Obsahuje:

- hrbetni ploutev
- brisni nebo prsni ploutve
- jemny pohyb ve 4 framech
- pozice sedi na vsech telech

Neobsahuje:

- telo
- ocas
- vzory
- nemoc

### fins_clamped.png

Stazene ploutve jako priznak potizi.

Obsahuje:

- male ploutve pritazene k telu
- pusobi mene zdrave nez normalni ploutve
- stejne navazne body jako fins_normal.png

Neobsahuje:

- telo
- ocas
- bile tecky
- jine projevy nemoci

### pattern_spots.png

Zdravy skvrnity vzor.

Obsahuje:

- vetsi barevne skvrny na tele
- skvrny nejsou bile
- skvrny vypadaji jako prirozeny vzor
- kopiruji pohyb tela ve vsech framech

Neobsahuje:

- male bile tecky
- nemoc
- ocas
- ploutve
- telo

### pattern_stripe.png

Zdravy pruhovany vzor.

Obsahuje:

- nekolik svislych nebo lehce sikmych pruhu na tele
- pruhy sedi na telo
- pruhy nejsou bile tecky

Neobsahuje:

- telo
- ocas
- ploutve
- nemoc

### pattern_glow.png

Tajemny svitivy vzor.

Obsahuje:

- jemnou svetlou linku nebo symbol na tele
- muze mit slabou tyrkysovou/zelenomodrou barvu
- vypada zvlastne, ale stale jako kresba na rybe

Neobsahuje:

- velke svetelne aura mimo telo
- pozadi
- bile tecky nemoci

### symptom_white_spots.png

Bila krupicka.

Obsahuje:

- male bile nebo svetle body na tele
- nepravidelne rozmistení
- ve vsech framech sedi na telo
- body jsou drobne a ostre

Neobsahuje:

- velke dekorativni skvrny
- barevny vzor
- telo
- ocas
- ploutve

Pozor: toto nesmi vypadat jako zdravy skvrnity vzor.

### symptom_pale_gills.png

Blede zabry.

Obsahuje:

- maly svetly nebo blede ruzovy znak za hlavou
- pouze oblast zaber
- nenapadne, citelne zblizka

Neobsahuje:

- tecky po tele
- vzor
- telo

### symptom_cloudy_eye.png

Zakalene oko.

Obsahuje:

- svetly zakal pres oko
- maly detail vpravo na hlave
- sedi na stejne misto oka u vsech tel

Neobsahuje:

- nove oko
- velky bily flek na hlave
- pozadi

### symptom_scratching.png

Otirani o dno nebo rostliny.

Obsahuje:

- drobne skrabance nebo kratke linky pod telem
- muze pusobit jako odrenina
- nemusi byt na cele rybe

Neobsahuje:

- velke rany
- krev
- komiksove efekty

### symptom_fast_breathing.png

Rychle dychani.

Obsahuje:

- male jemne linky nebo bublinky u tlamy/zaber
- velmi decentni animaci ve 4 framech
- nesmi prekrit hlavu

Neobsahuje:

- text
- velke vlny
- komiksove symboly

## Paleta a styl

Styl:

- pixel art
- maly desktop pet / akvarium
- trochu tajemna atmosfera
- ciste citelne tvary
- zadny realisticky render
- zadne rozmazani

Barvy:

- telo muze mit 3 odstiny: hlavni barva, stin, svetly hrbet
- ocasy a ploutve muzou byt trochu tmavsi
- nemocenske vrstvy maji byt citelne, ale ne prehnane

Pokud maji byt ryby prebarvitelne, pouzij maskove sede barvy:

```text
#404040 nebo #303030 = stin
#808080 nebo #A0A0A0 = hlavni barva
#C0C0C0 nebo #E0E0E0 = svetly hrbet / highlight
```

Pouzij presne tyto hodnoty. Jine barvy hra neprebarvi. Pokud vytvoris plne barevny pixel art, hra ho necha v puvodnich barvach.

## Checklist pred odevzdanim

Zkontroluj:

- vsechny soubory maji 384 x 64 px
- kazdy soubor ma 4 framy po 96 x 64 px
- pozadi je pruhledne
- ryba kouka doprava
- ocas je vlevo
- hlava je vpravo
- ocas nevypada jako hlava
- zdrave skvrny nejsou bile tecky
- bila krupicka neni dekorativni vzor
- vrstvy se navzajem kryji spravne
- vsechny vrstvy maji stejne zarovnani
- zadny soubor neobsahuje text ani ramecek

## Prvni doporucena davka

Pokud se ma vyrobit jen mala testovaci sada, vyrob nejdriv tyto soubory:

```text
body_deep.png
tail_veil.png
fins_normal.png
pattern_glow.png
symptom_white_spots.png
```

To otestuje Hlubinku a nejproblematictejsi ocas.
