const petsConfig = require("../config/pets");

function rollPet() {
    const roll = Math.random() * 100;
    let accumulated = 0;

    for (const [rarity, data] of Object.entries(petsConfig.rarities)) {
        accumulated += data.chance;
        if (roll <= accumulated) {
            const pet =
                data.pets[Math.floor(Math.random() * data.pets.length)];
            return { pet, rarity };
        }
    }

    // Fallback
    const commonPets = petsConfig.rarities.common.pets;
    return { pet: commonPets[0], rarity: "common" };
}

module.exports = { rollPet };