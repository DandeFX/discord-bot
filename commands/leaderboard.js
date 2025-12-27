const { userData } = require("../data/userData");

module.exports = {
    name: ".leaderboard",
    async run(message, args, client) {
        const sorted = [...userData.entries()]
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, 10);

        if (sorted.length === 0) return message.reply("📭 Noch keine Punkte vorhanden.");

        let text = "🏆 **Leaderboard – Top 10**\n\n";

        for (let i = 0; i < sorted.length; i++) {
            const [id, data] = sorted[i];
            const user = await client.users.fetch(id).catch(() => null);
            text += `${i + 1}. **${user ? user.username : "Unbekannt"}** – ${data.points} Punkt(e)\n`;
        }

        message.channel.send(text);
    }
};