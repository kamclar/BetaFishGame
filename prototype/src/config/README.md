# Ladeni hry

Soubory v teto slozce obsahuji herni hodnoty, ktere je mozne menit bez upravovani logiky systemu.

- `economyConfig.js` - pocatecni penize, ceny, odemykani obchodu, zasoby, denni cile a zkusenostni urovne
- `fishConfig.js` - hlad, zdravi, stres, lecba, zivotni faze a profilova animace uhorovitych ryb
- `timeConfig.js` - rychlost normalniho a debug casu
- `behaviorConfig.js` - den/noc, aktivita, hejno, ukryvani a namluvy
- `waterConfig.js` - kapacity nadrzi, odpad, dusikovy cyklus, kyslik, teplota, svetlo a bezpecne limity testu
- `plantConfig.js` - dny rustovych fazi jednotlivych rostlin, vliv prostredi, kveteni a velikost plovoucich rostlin
- `breedingConfig.js` - delka namluv, inkubace, cooldown, velikost snusky, mutace a startovni stav poteru
- `geneticsConfig.js` - dostupne alely, dominance, vychozi alely a cetnost skrytych genu
- `colorLineConfig.js` - pojmenovane vzacne trojice pigmentu a jejich cenove bonusy
- `salesConfig.js` - ceny ryb, delka navstev, rychlost zakazniku a sance na nakup
- `storyConfig.js` - pozadovana uroven a denni sance na nalezeni pozdnich eldritch stranek deniku

Druhy ryb se ladi v `../data/speciesData.js`, konkretni startovni ryby v `../data/fishData.js`, rostliny v `../data/plantData.js` a nemoci v `../data/healthData.js`. Tyto soubory jsou take datove konfigurace, nikoli vykonna herni logika.

Po zmene konfigurace spust:

```powershell
npm.cmd run check
```

Zmeny vychozich hodnot se nemusi projevit na hodnotach, ktere uz jsou ulozene v existujicim save. Pro test uplne novych defaults pouzij tlacitko `Nova hra`.
