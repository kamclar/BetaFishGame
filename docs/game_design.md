# Beta Fish Game - herni design

## Stav dokumentu

Prvni pracovni navrh. Hra se bude nejdriv navrhovat a prototypovat v cestine. Vsechny hracske texty maji byt pozdeji snadno prelozitelne, proto je potreba drzet texty oddelene od logiky a nepsat je natvrdo do systemu.

## Zakladni predstava

Idle simulace chovu fiktivnich akvarijnich ryb pro Windows. Hrac ma male akvarium, sleduje ryby, krmi je, meri vodu, leci nemoci, mnozi linie a postupne objevuje zvlastni druhy. Hra ma mit klidny rytmus, trochu temnejsi atmosferu a obcas tajemne udalosti kolem vzacnych ryb.

Prvni silny pocit prototypu: ryby pusobi zive. Plavou, reaguji na stav vody, maji individualni historii a hrac si k nim muze vytvorit vztah.

## Platforma a zobrazeni

Zakladni rezim je akvarium jako samostatne okno na plose. Hrac vidi nadrz, ryby, police s predmety a jednoduche ovladaci prvky.

Pozdejsi volitelny rezim muze pustit ryby mimo akvarium pres plochu. Pracovni nazev: venceni ryb. Tento rezim ma byt specialni hracka nebo mod, ne hlavni zpusob hrani.

## Cas

Hra bezi v realnem case. Ryby rostou, metabolismus pracuje a udalosti se mohou vyvijet i pri klidnem hrani na pozadi.

Pro vyvoj a testovani bude existovat debug cas:

- zrychleni casu
- pauza simulace
- preskok o hodinu nebo den
- vynuceni rozmnozeni
- vynuceni udalosti
- zobrazeni skrytych hodnot ryb a vody

Debug cas nesmi byt propojeny s normalnim save modem hrace, pokud nebude hra spustena ve vyvojovem rezimu.

## Ton

Hra je klidna, trochu temna, ale nema byt prehnane kruta. Bezna ryba nema byt neustale nemocna. Nemoci, uhyny a chyby se objevuji jako realisticke dusledky spatne pece, stresu, karanteny nebo vody.

Tajemno se objevi postupne:

- divna ryba z lesniho jezirka
- nezvykle chovani v noci
- zapisky byvalych chovatelu
- zvlastni reakce na rostliny, ph, denni dobu nebo potravu
- vzacne linie s nejasnym puvodem
- obcasna cthulhu rybka nebo znak, ktery do bezneho chovu nepatri

## Svet a druhy

Vsechny druhy jsou fiktivni. Mohou byt inspirovane skutecnymi akvarijnimi rybami, ale nazvy, genetika a chovani budou vlastni hre.

Priklady smeru:

- male hejnovky pro zacatek
- odolne zacatecnicke ryby
- citlive krasne druhy
- nocni druhy
- druhy vazane na rostliny
- druhy z mekke kysele vody
- tajemne jezirkove druhy
- vzacne linie odemykane recepty

## Hlavni loop

1. Hrac sleduje akvarium a chovani ryb.
2. Krmi ryby, meri vodu a upravuje prostredi.
3. Ryby rostou, stresuji se, odpocivaji, navazuji pary a mnozi se.
4. Hrac vybira ryby pro dalsi chov.
5. Prebytecne nebo cilene odchovane ryby pripravi na prodej.
6. Za vydelane penize kupuje vybaveni, jidlo, leky, rostliny a dalsi nadrze.
7. Pres genetiku, prostredi, predmety a cas objevuje nove kombinace a druhy.

## Priorita prvniho prototypu

Prvni prototyp se soustredi na ryby:

- ryby plavou v akvariu
- ryby maji jmeno, druh, vek, zdravi a historii
- klik na rybu otevre zdravotni kartu
- ryby maji jednoduchy fenotyp slozeny z vrstev
- stav vody ovlivnuje pohyb nebo naladu ryb
- hrac muze nakrmit akvarium
- hra uklada stav

Zivotni cyklus ryb:

- poter
- mlada ryba
- dorustajici
- dospela
- starsi ryba

Faze ovlivnuje velikost, rychlost a schopnost mnozeni. Dospela ryba se muze mnozit jen pokud neni blokovana nemoci nebo stresem.

Genetika, obchod a prodejni mistnost mohou prijit hned po zakladnim pocitu zive nadrze.

## Ovladani

Hrac pracuje s akvariem hlavne pres:

- klikani na ryby
- predmety na policce
- detailni kartu ryby
- historii ryby
- jednoduchy inventar
- karty pro prepinani mezi nadrzemi

Klik na rybu otevre kartu ryby.

Karta ryby obsahuje:

- jmeno
- druh
- vek
- pohlavi nebo reprodukcni typ
- zdravi
- stres
- aktualni stav
- viditelne vlastnosti
- rodice
- potomci
- zaznamy udalosti
- karantena, lecba a prodejni historie

Z karty ryby jde rybu presunout do jine nadrze, treba do karanteny nebo z karanteny zpet. Police obsahuje predmety, ne prepinani lokaci.

Historie v karte ryby patri jen konkretni rybe: odkud pochazi, presuny mezi nadrzemi, lecba, karantena, rozmnozovani a prodej.

Obecne udalosti akvaria a pribehove poznamky patri do samostatneho denicku mimo kartu ryby.

Desktopove rozvrzeni:

- nadrze se prepinaji nahore jako karty
- predmety jsou vlevo jako uzka police/dock
- karta vybrane ryby je vpravo jako plovouci panel
- obecny denicek je mimo kartu ryby
- bezne UI se muze schovat a ukazat pri najeti mysi

Osazeni nadrze patri ke konkretni nadrzi. Rostliny a dekorace pridane do hlavniho akvaria se nemaji objevit v karantene.

Hrac muze ryby pojmenovavat a oznacovat oblibene linie.

## Lokalizace

Texty maji byt pripravene na preklad od zacatku.

Pravidla:

- herni logika nepouziva primo text pro hrace
- kazdy text ma vlastni klic
- texty jsou v lokalizacnich souborech
- druhy, affixy, predmety a udalosti maji oddelene zobrazovane nazvy
- formatovani cisel, casu a meny se resi mimo text

Priklad klicu:

```text
fish.species.glass_minnow.name = Sklenena strelka
fish.affix.nocturnal.name = Nocni
item.food.basic_flakes.name = Zakladni vlocky
event.sales_day.started = Prodejni den zacal.
ui.fish_card.health = Zdravi
```

## Fenotyp a grafika ryb

Pixel art bude slozeny z vrstev. Fenotyp modre ryby s dlouhym ocasem a skvrnami se posklada z techto casti:

- zakladni telo
- dlouhy ocas
- bezne ploutve
- modra paleta
- skvrnity vzor

Zakladni vrstvy:

- telo
- ocas
- hrbetni ploutev
- brisni ploutve
- oko
- hlavni barva
- barva ploutvi
- vzor
- specialni znak
- stav, treba nemoc nebo stres

Barvy se resi paletami nebo maskami. Tvarove znaky se resi variantami vrstev.

Prvni sada pro prototyp:

- 1 telo
- 3 ocasy
- 3 hlavni barvy
- 3 vzory
- 2 barvy ploutvi
- 2 specialni mutace

Animace musi byt jednoducha a kompatibilni mezi vrstvami:

- kratka smycka plavani
- stejna pozice vrstev pro dany druh
- ocas a ploutve maji stejne navazne body
- vzory sedi na telo jako maska

## Genetika

Genetika ma byt skutecna, ale citelna. Laik ma rozumet zakladnimu principu. Zkuseny hrac muze resit hlubsi vrstvy.

Viditelna uroven pro hrace:

- ryba muze nest skryty znak
- nektere znaky jsou dominantni
- nektere znaky se projevi jen pri spravne kombinaci
- pribuzenske krizeni muze snizit vitalitu
- zdrava linie ma vyssi cenu a lepsi sanci na preziti poteru

Vnitrni uroven systemu:

- alely
- dominantni a recesivni znaky
- neuplna dominance
- kodominance
- polygenni znaky
- mutace
- vitalita
- imunita
- koeficient pribuznosti
- rodokmen

Genotyp se pri narozeni prepocita na fenotyp. Renderer z fenotypu slozi vzhled ryby.

## Rarity, affixy a vlastnosti

Ryby maji raritu, affixy a bezne vlastnosti.

Navrh rarit:

- Common
- Uncommon
- Rare
- Exotic
- Mythic
- Eldritch

Pracovni affixy:

- Robustni
- Plodna
- Vybirava
- Nocni
- Agresivni
- Symbioticka
- Skvrnita
- Hlubinna
- Septajici
- Necitelna

Affix muze ovlivnit:

- chovani
- cenu
- zdravi
- kompatibilitu s nadrzi
- rozmnozovani
- reakci na predmety
- sanci na udalost

## Voda

Zakladni hodnoty:

- teplota
- ph
- tvrdost
- amoniak
- dusitany
- dusicnany
- kyslik
- organicke znecisteni

Pozdejsi tajemne hodnoty:

- cernani vody
- neznamy biologicky signal
- nocni aktivita mikroorganismu
- pritomnost spor

Rostliny pomahaji hlavne s dusicnany. Nektere rostliny mohou mit specialni efekty pro poter, skryte druhy nebo stabilitu nadrze.

## Nemoci a karantena

Nova ryba musi projit karantenou. Pokud ji hrac pusti rovnou do hlavni nadrze, muze zanest nemoc.

Nemoci maji byt realisticke a citelne:

- spatna voda zvysuje riziko
- stres zhorsuje prubeh
- karantena snizuje riziko pro hlavni akvarium
- leky mohou mit vedlejsi ucinky
- citlive druhy potrebuji jemnejsi pristup

Normalni zdrava nadrz nema byt neustaly krizovy stav.

Projevy nemoci a potizi jsou oddelene od fenotypu. Skvrnity vzor ryby je vzhled. Bile tecky jako priznak jsou zdravotni projev.

Prvni databaze projevu:

- bile tecky
- stazene ploutve
- rychle dychani
- blede zabry
- otirani o dno nebo rostliny
- zakalene oko

Nemoc ma vlastni prubeh. Priznaky jsou projev aktualni faze.

Prvni priklad: bila krupicka

- zacatek: par bilych tecek, ryba se muze obcas otirat
- rozpuk: ryba je poseta teckami, je nakazliva a nemnozi se
- vycerpani: ryba hubne, skoro nezere a rychle dycha
- robustni ryby snaseji prubeh lepe
- ve velmi dobre vode se muze mirny prubeh zlepsit i sam
- lecba v karantene zabira rychleji
- lecba neni okamzita, rybu je potreba pozorovat
- spatny stav muze zablokovat krmeni nebo mnozeni

Mozne zdroje potizi:

- nova ryba bez karanteny
- nova rostlina
- krmivo
- spatna voda
- dlouhodoby stres
- prevoz na prodejni den
- prelidnena nadrz
- zaneseny filtr
- zivy nalez z prirody
- podezrely predmet nebo substrat

Karantena:

- nova ryba ma jit nejdriv do izolacni nadrze
- karantena chrani hlavni akvarium
- v karantene se projevy sleduji nekolik hernich dni
- ryba muze byt lecena bez rizika pro ostatni ryby
- navrat do hlavni nadrze ma byt mozny az po zlepseni stavu nebo po rozhodnuti hrace

Leciva:

- zakladni lek umi zmirnit bezny priznak
- silnejsi leky mohou byt drazsi a mit vedlejsi ucinky
- nektere leky mohou stresovat rybu
- nektere leky mohou poskodit rostliny nebo poter
- spatne zvoleny lek muze jen maskovat problem

## Ekonomika

Na zacatku ma hrac malo penez. Obchod ukazuje veci, po kterych hrac touzi, ale jeste si je nemuze dovolit.

Rane cile:

- karantenni set
- akvarium pro poter
- lepsi filtr
- zakladni rostliny
- testy vody
- kvalitnejsi krmivo
- prvni lecivo do zasoby

Prijmy:

- prodej odchovanych ryb
- prodej vzacnych znaku
- prodej zdravych linii
- specialni nabidky behem prodejniho dne
- vymeny za predmety

Vydaje:

- jidlo
- testy
- leky
- rostliny
- filtry
- dalsi nadrze
- pronajem prodejni mistnosti
- prepravni vybaveni

Ekonomika ma podporovat planovani. Kazdy vetsi nakup ma otevrit novou moznost nebo snizit konkretni riziko.

## Obchod

Obchod ma stale zbozi a obcasne nabidky.

Stale zbozi:

- zakladni vlocky
- test ph
- levna rostlina
- sitka
- maly filtr
- jednoduche lecivo

Pokrocile zbozi:

- testovaci sada
- zive krmivo
- specialni krmiva
- lepsi filtry
- uv sterilizator
- akvarium pro poter
- karantenni nadrz
- prepravni box
- atlas linii

Podezrele zbozi:

- krmivo bez etikety
- stary koren z jezirka
- cerny substrat
- mineralni kapky
- kniha s vytrzenymi strankami
- ryba od neznameho chovatele

## Prodejni den

Prodej ryb probiha jako udalost. Hrac si jednou za cas pronajme prodejni mistnost ve zverimexu nebo podobnem prostoru.

Pred zacatkem vybere:

- ryby k prodeji
- prodejni nadrze
- ceny
- popisky
- prezentaci
- pripadne specialni vybaveni

Po spusteni udalosti se hra prepne do prodejni mistnosti. Hrac nevidi domaci akvaria, vidi jen ryby urcene k prodeji.

Zakaznici prichazeji postupne. Nekteri hledaji nenarocnou rybu, jini vzacny znak, zdravou linii nebo konkretni vzhled. Kdyz se ryba proda, zmizi z prodejni nadrze.

Behem prodejniho dne muze hrac:

- sledovat zajem zakazniku
- menit cenu
- stahnout rybu z prodeje
- presunout rybu mezi nadrzemi
- prijmout nebo odmitnout zvlastni nabidku

Na konci dne dostane report:

- prodane ryby
- utrzene penize
- naklady na pronajem
- neprodane ryby
- zmena reputace
- poznamky k poptavce
- pripadne pribehove stopy

Neprodane ryby se vraci domu. Mohou byt vystresovane z prevozu.

## Pribeh

Pribeh se rozviji pres deniky, udalosti a obcasne postavy.

Zakladni motiv:

Hrac si prinese malou zvlastni rybu z lesniho jezirka. Zprvu vypada pekne a nenapadne. Postupne se ukaze, ze reaguje na podminky, ktere bezne ryby nezajimaji.

Moje poznamky pro pribeh:

- denik byvaleho chovatele
- stary zverimexar, ktery zna vic, nez rika
- nocni udalosti v akvariu
- recepty zavisle na denni dobe, ph, rostlinach a linii
- vzacne druhy, ktere nevzniknou nahodne
- podivne nabidky pri prodejni udalosti

## Recepty a objevovani

Nove druhy lze ziskat ruznymi cestami:

- krizeni
- nakup
- nalez
- udalost
- specialni recept
- vymena
- pribehovy objev

Vzorce pro vzacne druhy mohou zaviset na:

- rodicich
- ph
- teplote
- rostline
- potrave
- denni dobe
- mesicni fazi nebo hernim ekvivalentu
- stresu
- specialnim predmetu
- historii linie

Hrac muze neco objevit nahodou, ale peclivy hrac ma mit lepsi vysledky diky pozorovani a zapiskum.

## Moduly pro pozdejsi implementaci

Navrh modulu:

- FishCore
- Genetics
- PhenotypeRenderer
- AquariumSim
- WaterSystem
- PlantSystem
- ItemSystem
- DiseaseSystem
- QuarantineSystem
- BreedingSystem
- PedigreeSystem
- Economy
- Shop
- SalesDay
- StoryEvents
- Localization
- SaveSystem
- DesktopWindow
- DebugTools

Kazdy modul ma mit jasnou odpovednost a minimalni zavislosti na ostatnich modulech.

## Otevrene otazky

- Jak velke ma byt prvni okno akvaria?
- Ma byt akvarium vzdy na vrchu?
- Jak moc muze hra bezet na pozadi, kdyz je vypnuta?
- Bude cena v korunach, nebo fiktivni mene?
- Jak se bude jmenovat zakladni lokace?
- Jak bude vypadat prvni ryba z jezirka?
- Ktere tri druhy patri do prvniho prototypu?
- Jaky engine nebo framework pouzijeme?
