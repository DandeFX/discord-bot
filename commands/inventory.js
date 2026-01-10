const { getUserData } = require("../data/userData");

module.exports = {
    name: ".inventory",

    async run(message) {
        const target = message.mentions.users.first() || message.author;
        const data = getUserData(target.id);

        if (!data.items) {
            return message.reply("🎒 Inventar ist leer.");
        }

        const keys = data.items;
        const items = data.items.items || {};
        const boosts = data.items.activeBoosts || {};

        let text = `🎒 **Inventar von ${target.username}**\n\n`;

        // 🔑 Keys
        text += "**🔑 Keys**\n";
        text += `💙 Rare Key: ${keys.rareKey || 0}\n`;
        text += `💜 Epic Key: ${keys.epicKey || 0}\n`;
        text += `🌟 Legendary Key: ${keys.legendaryKey || 0}\n\n`;

        // 📦 Items
        text += "**📦 Items**\n";
        if (Object.keys(items).length === 0) {
            text += "— Keine Items —\n";
        } else {
            for (const [id, amount] of Object.entries(items)) {
                if (amount > 0) {
                    text += `• **${id}** ×${amount}\n`;
                }
            }
        }

        // ✨ Aktive Effekte
        text += "\n**✨ Aktive Effekte**\n";
        if (Object.keys(boosts).length === 0) {
            text += "— Keine aktiven Effekte —";
        } else {
            for (const [key, effect] of Object.entries(boosts)) {
                const remaining = effect.expires - Date.now();
                const minutes = Math.max(0, Math.floor(remaining / 60000));
                text += `• ${key} (${effect.multiplier}x) – ${minutes} Min\n`;
            }
        }

        return message.reply(text);
    }
};