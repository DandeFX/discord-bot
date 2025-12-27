const RANKS = require("../config/ranks");
const { userData } = require("../data/userData");

module.exports = {
    name: ".ranks",
    async run(message, args) {
        const userId = message.author.id;
        const data = userData.get(userId) || { points: 0 };
        const userPoints = data.points;

        const currentRank = RANKS
            .slice()
            .sort((a, b) => b.min - a.min)
            .find(r => userPoints >= r.min);

        let text = "📜 **Ränge & benötigte Punkt(e)**\n\n";

        for (const rank of RANKS.sort((a, b) => b.min - a.min)) {
            if (rank.name === currentRank.name) text += `➡️ **${rank.name}** – ${rank.min} Punkt(e)\n`;
            else text += `${rank.name} – ${rank.min} Punkt(e)\n`;
        }

        return message.reply(text);
    }
};