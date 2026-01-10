const petsConfig = require("../config/pets");
const { rollPet } = require("../utils/pets");
const { getUserData, saveUserData } = require("../data/userData");
const { tryUpgradePet } = require("../utils/petUpgrade");

module.exports = {
    name: ".pet",

    async run(message, args) {
        const sub = args[1];
        const data = getUserData(message.author.id);

        if (!data.pets) data.pets = { owned: {}, active: null };

        // HELP
        if (!sub || sub === "help") {
            return message.reply(
                `🐾 **PETS – Hilfe**\n\n` +
                `💰 Kosten: **1000 Punkte**\n\n` +
                `📦 Befehle:\n` +
                `\`.pet buy\` → Zufälliges Pet kaufen\n` +
                `\`.pet list\` → Deine Pets anzeigen\n` +
                `\`.pet <Name>\` → Pet aktivieren für 3 Std\n` +
                `\`.pet status\` → Aktives Pet anzeigen\n\n` +
                `ℹ️ Infos:\n` +
                `• Nur 1 Pet gleichzeitig aktiv\n` +
                `• Pets geben 1× pro Stunde Punkte\n` +
                `• Duplikate können zu Upgrades führen`
            );
        }

        // STATUS
        if (sub === "status") {
            const active = data.pets.active;
            if (!active) return message.reply("❌ Du hast aktuell kein aktives Pet.");

            const rarityData = petsConfig.rarities[active.rarity];
            const remainingMs = active.expires - Date.now();
            const remainingHours = Math.max(0, (remainingMs / 3600000).toFixed(2));
            const nextPayoutMin = Math.ceil(Math.max(0, 60 * 60 * 1000 - (Date.now() - active.lastPayout)) / 60000);

            return message.reply(
                `🐾 **Aktives Pet**\n` +
                `🦴 Name: **${active.petId}**\n` +
                `⭐ Seltenheit: **${active.rarity}**\n` +
                `💰 Punkte/Stunde: **${rarityData.pointsPerHour}**\n` +
                `⏳ Aktiv für: **${remainingHours} Std**\n` +
                `⏱️ Nächste Auszahlung in: **${nextPayoutMin} Min**`
            );
        }

        // LIST
        if (sub === "list") {
            if (!Object.keys(data.pets.owned).length) return message.reply("❌ Du besitzt keine Pets.");
            const list = Object.entries(data.pets.owned)
                .map(([name, count]) => `• ${name} x${count}`)
                .join("\n");
            return message.reply(`🐾 **Deine Pets:**\n${list}`);
        }

        // BUY
        if (sub === "buy") {
            if (data.points < petsConfig.cost) return message.reply("❌ Nicht genug Punkte (1000 benötigt).");
            data.points -= petsConfig.cost;

            const { pet, rarity } = rollPet();
            data.pets.owned[pet] = (data.pets.owned[pet] || 0) + 1;

            let reply = `🎉 Du hast **${pet}** erhalten!\n⭐ Seltenheit: **${rarity}**`;

            const upgrade = tryUpgradePet(data, pet, rarity);
            if (upgrade) {
                reply += `\n\n🔁 **UPGRADE!**\n5× ${upgrade.from} → **${upgrade.to}** (${upgrade.rarity})`;
            }

            saveUserData();
            return message.reply(reply);
        }

        // ACTIVATE
        const petName = args.slice(1).join(" ");
        if (!petName) return;

        if (data.pets.active) return message.reply("❌ Du hast bereits ein aktives Pet.");
        if (!data.pets.owned[petName]) return message.reply("❌ Dieses Pet besitzt du nicht.");

        let rarity = null;
        for (const [r, info] of Object.entries(petsConfig.rarities)) {
            if (info.pets.includes(petName)) { rarity = r; break; }
        }
        if (!rarity) return message.reply("❌ Pet-Seltenheit konnte nicht bestimmt werden.");

        data.pets.active = {
            petId: petName,
            rarity,
            expires: Date.now() + 3 * 60 * 60 * 1000,
            lastPayout: Date.now()
        };

        saveUserData();
        return message.reply(`🐾 **${petName} wurde gepettet!**`);
    }
};