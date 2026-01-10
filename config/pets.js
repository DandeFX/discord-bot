module.exports = {
    cost: 1000,

    rarityOrder: ["common", "uncommon", "rare", "epic", "legendary"],

    rarities: {
        common: {
            chance: 64,
            pointsPerHour: 5,
            pets: ["cthulhu", "willy wurm", "einhornchen"]
        },
        uncommon: {
            chance: 20,
            pointsPerHour: 10,
            pets: ["tante tarantula", "nils nashorn"]
        },
        rare: {
            chance: 10,
            pointsPerHour: 20,
            pets: ["tippy toe", "flynn fliege"]
        },
        epic: {
            chance: 5,
            pointsPerHour: 35,
            pets: ["jeff", "ziggs"]
        },
        legendary: {
            chance: 1,
            pointsPerHour: 50,
            pets: ["bolle"]
        }
    }
};