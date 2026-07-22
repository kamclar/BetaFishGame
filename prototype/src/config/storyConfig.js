// Odemknuti pozdnich stranek deniku. Level pouze dovoli nahodny nalez;
// odpovidajici znak ryby a dalsi podminky jsou vzdy povinne.
export const storyDiscoveryConfig = {
  closeLineMinimumSkillXp: 15,
  minimumDaysBetweenEldritchPages: 3,
  eldritch: {
    pond_fish: { stage: 1, minimumSkillXp: 8, chancePerDay: 0.28 },
    night_watch: { stage: 2, minimumSkillXp: 15, chancePerDay: 0.22, nightOnly: true },
    wrong_clutch: { stage: 3, minimumSkillXp: 25, chancePerDay: 0.16, requiresBrood: true },
    last_page: { stage: 4, minimumSkillXp: 50, chancePerDay: 0.1, requiresBrood: true },
  },
};
