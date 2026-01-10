const { getUserData, saveUserData } = require("../data/userData");

const ITEM_EFFECTS = {
    smallXPBoost: {
        name: "🧪 Kleine XP-Boost",
        duration: 60 * 60 * 1000, // 1 Stunde
        apply(user) {
            user.items.activeBoosts.xpBoost = {
                multiplier: 1.25,
                expires: Date.now() + this.duration
            };
        }
    },

    mediumXPBoost: {
        name: "🧪 Mittlere XP-Boost",
        duration: 2 * 60 * 60 * 1000,
        apply(user) {
            user.items.activeBoosts.xpBoost = {
                multiplier: 1.5,
                expires: Date.now() + this.duration
            };
        }
    },

    megaXPBoost: {
        name: "🧪 Mega XP-Boost",
        duration: 4 * 60 * 60 * 1000,
        apply(user) {
            user.items.activeBoosts.xpBoost = {
                multiplier: 2,
                expires: Date.now() + this.duration
            };
        }
    }
};

module.exports = {
    name: ".use",

    async run(message, args) {
        const itemId = args[1];
        if (!itemId) {
            return message.reply("❌ Nutzung: `.use <itemId>`");
        }

        const data = getUserData(message.author.id);

        if (!data.items) {
            return message.reply("❌ Du besitzt keine Items.");
        }

        if (!data.items.items[itemId] || data.items.items[itemId] <= 0) {
            return message.reply("❌ Du besitzt dieses Item nicht.");
        }

        const effect = ITEM_EFFECTS[itemId];
        if (!effect) {
            return message.reply("❌ Dieses Item kann nicht benutzt werden.");
        }

        // aktive Effekte initialisieren
        if (!data.items.activeBoosts) {
            data.items.activeBoosts = {};
        }

        // Item verbrauchen
        data.items.items[itemId]--;

        // Effekt anwenden
        effect.apply(data);

        saveUserData();

        await message.reply(
            `✨ **${effect.name} aktiviert!**\n` +
            `⏳ Dauer: ${effect.duration / 3600000} Stunde(n)`
        );
    }
};