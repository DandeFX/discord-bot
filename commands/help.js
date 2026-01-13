const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: ".help",

    async run(message) {
        const embed = new EmbedBuilder()
            .setTitle("📜 Hilfe – Verfügbare Commands")
            .setColor(0x1abc9c)
            .setDescription(
                "Nutze die folgenden Commands, um Punkte zu sammeln, zu spielen oder Loot zu erhalten."
            )
            .addFields(
                {
                    name: "📊 Allgemein",
                    value:
`**.help** – Zeigt diese Hilfe  
**.punkte [User]** – Punktestand anzeigen
**.peter** – Spielt ein zufälliges Peter GIF ab  
**.leaderboard** – Top 10 Spieler  
**.ranks** – Alle Ränge & dein Rang`
                },
                {
                    name: "🎁 Daily & Progress",
                    value:
`**.daily** – Tägliche Belohnung  
**.stats [@User]** – Stats inkl. Punkte, Streak, Keys & Gambling
**.inventory** – Zeigt dein Inventar & aktive Effekte
**.use <item>** – Item benutzen`
                },
                {
                    name: "🎲 Spiele",
                    value:
`**.coinflip [Einsatz]** – 50/50  
**.roulette [Einsatz] [Zahl/rot/schwarz/grün]**  
**.hot [Einsatz] [heads/tails]** – Heads or Tails  
**.crash [Einsatz]** – Cashout vor dem Crash  
**.stp [Spieler] [Einsatz] ** – Schere, Stein, Papier`
                },
                {
                    name: "🎁 Drops & Lootboxen",
                    value:
`**.drop** – Aktiven Drop claimen  
**.lootbox <rare|epic|legendary>** – Öffnet eine Lootbox`
                },
                {
                    name: "🎒 Items (aus Lootboxen)",
                    value:
`• **XP-Boost** – Mehr Gambling-XP`
                },
                {
                    name: "💸 Interaktion",
                    value:
`**.gift @User [Punkte]** – Punkte verschenken  
**.kamikaze @User** – 50/50, Punkteverlust möglich`
                },
                {
                    name: "🛠️ Admin",
                    value:
`**.add @User [Punkte]** – Punkte hinzufügen  
**.remove @User [Punkte]** – Punkte entfernen`
                }
            )
            .setFooter({ text: "Judgement Inc" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};