const petsConfig = require("../config/pets");

function tryUpgradePet(data, petName, rarity) {
    if (rarity === "legendary") return null;
    if ((data.pets.owned[petName] || 0) < 5) return null;

    const order = petsConfig.rarityOrder;
    const nextRarity = order[order.indexOf(rarity) + 1];
    if (!nextRarity) return null;

    // 5 verbrauchen
    data.pets.owned[petName] -= 5;
    if (data.pets.owned[petName] <= 0) delete data.pets.owned[petName];

    // Neues Pet aus nächster Seltenheit
    const nextPets = petsConfig.rarities[nextRarity].pets;
    const newPet = nextPets[Math.floor(Math.random() * nextPets.length)];

    data.pets.owned[newPet] = (data.pets.owned[newPet] || 0) + 1;

    return { from: petName, to: newPet, rarity: nextRarity };
}

module.exports = { tryUpgradePet };