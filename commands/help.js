const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: ".help",

    async run(message) {
        const embed = new EmbedBuilder()
            .setTitle("📜 Hilfe – Verfügbare Commands")
            .setColor(0x1abc9c)
            .setDescription(
                "Nutze die folgenden Commands, um Punkte zu sammeln, zu spielen oder den Server zu verwalten."
            )
            .addFields(
                {
                    name: "📊 Allgemein",
                    value:
`**.help** – Zeigt diese Hilfe  
**.punkte [User]** – Punktestand anzeigen  
**.leaderboard** – Top 10 Spieler  
**.ranks** – Alle Ränge & dein Rang`
                },
                {
                    name: "🎁 Daily & Progress",
                    value:
`**.daily** – Tägliche Belohnung  
**.stats** – Punkte, Streak, Cooldown und highest Crash Payout`
                },
                {
                    name: "🎲 Spiele",
                    value:
`**.coinflip [Einsatz]** – 50/50  
**.roulette [Einsatz] [Zahl/rot/schwarz/grün]**
**.hot [Einsatz] [heads/tails]** – Heads or Tails
**.crash [Einsatz]** – Cashout vor dem Crash
**.stp [Einsatz] [Spieler]** - Schere, Stein, Papier gegen einen anderen Spieler`
                },
                {
                    name: "💸 Interaktion",
                    value:
`**.gift @User [Punkte]** – Punkte verschenken  
**.kamikaze @User** – Beide verlieren 100 Punkte 
**.drop** – Drop oder Lucky Drop claimen`
                },
                {
                    name: "🛠️ Admin",
                    value:
`**.add @User [Punkte]** – Punkte hinzufügen  
**.remove @User [Punkte]** – Punkte entfernen  
**.clear [Anzahl]** – Nachrichten löschen  
**.startdrop** – Manuellen Drop starten`
                }
            )
            .setFooter({ text: "Judgement Inc" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};