const petsConfig = require("../config/pets");
const { getAllUsers, saveUserData } = require("../data/userData");

module.exports = function startPetPayoutLoop(client, updateUserRank) {
    setInterval(async () => {
        const users = getAllUsers();
        const now = Date.now();

        for (const [userId, data] of users.entries()) {
            const active = data.pets?.active;
            if (!active) continue;

            // Abgelaufen
            if (now >= active.expires) {
                data.pets.active = null;
                continue;
            }

            // Noch keine Stunde
            if (now - active.lastPayout < 60 * 60 * 1000) continue;

            const rarityData = petsConfig.rarities[active.rarity];
            if (!rarityData) continue;

            // Auszahlung
            data.points += rarityData.pointsPerHour;
            active.lastPayout = now;

            // Rang updaten
            const guild = client.guilds.cache.first();
            const member = guild?.members.cache.get(userId);
            if (member && updateUserRank) {
                await updateUserRank(member, data.points);
            }
        }

        saveUserData();
    }, 60 * 1000); // jede Minute prüfen
};