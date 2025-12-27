require("dotenv").config();

const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const activeCrashGameRef = { game: null };

const {
    getTodayString,
    getTomorrowMidnight,
    formatDuration
} = require("./utils/time");

const {
    loadUserData,
    saveUserData,
    getUserData,
    userData
} = require("./data/userData");

const statsCommand = require("./commands/stats");
const stpCommand = require("./commands/stp");
const coinflipCommand = require("./commands/coinflip");
const rouletteCommand = require("./commands/roulette");
const hotCommand = require("./commands/hot");
const crashCommand = require("./commands/crash");
const giftCommand = require("./commands/gift");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const RANKS = [
    { name: "🔥 Legendär", min: 100000 },
    { name: "🏆 Großmeister", min: 20000 },
    { name: "🧠 Meister", min: 5000 },
    { name: "👨‍🎓 Geselle", min: 1000 },
    { name: "📘 Lehrling", min: 100 },
    { name: "🐣 Anfänger", min: 0 }
];

async function updateUserRank(member, points) {
    if (!member?.guild) return;

    const guild = member.guild;
    const targetRank = RANKS.slice().sort((a, b) => b.min - a.min).find(r => points >= r.min);
    if (!targetRank) return;

    const newRole = guild.roles.cache.find(r => r.name === targetRank.name);
    if (!newRole) {
        console.log("Rang nicht gefunden:", targetRank.name);
        return;
    }

    const allRankRoles = RANKS.map(r => guild.roles.cache.find(role => role.name === r.name)).filter(Boolean);

    for (const role of allRankRoles) {
        if (member.roles.cache.has(role.id) && role.id !== newRole.id) {
            await member.roles.remove(role).catch(err => console.log("Fehler beim Entfernen:", err));
        }
    }

    if (!member.roles.cache.has(newRole.id)) {
        await member.roles.add(newRole).catch(err => console.log("Fehler beim Hinzufügen:", err));
    }
}

/* ========================
   DROP SYSTEM (GLOBAL)
======================== */

const DROP_CHANNEL_ID = "1450567294714515549";

let currentDrop = null;
let lastDropTime = 0;
let dropLock = false; 
let dropExpireTimer = null;
let dropMessageId = null;

async function startDrop(channel, force = false) {
    if (!channel) return;
    if (dropLock) return; 
    dropLock = true;

    const now = Date.now();

    // Nur alle 6 Stunden, außer force=true
    if (!force && now - lastDropTime < 6 * 60 * 60 * 1000) {
        dropLock = false;
        return;
    }

    // Kein aktiver Drop darf existieren
    if (currentDrop) {
        dropLock = false;
        return;
    }

    currentDrop = { claimed: false };
    lastDropTime = now;

    const msg = await channel.send("🎁 **Ein Drop ist erschienen!** Tippe `.drop` um ihn zu claimen!");
    dropMessageId = msg.id;

    // Falls noch ein alter Ablauf-Timer existiert, killen
    if (dropExpireTimer) clearTimeout(dropExpireTimer);

    // NEW: Drop läuft nach 10 Minuten ab
    dropExpireTimer = setTimeout(async () => {
        if (currentDrop && !currentDrop.claimed) {
            currentDrop = null;

            // optional: Nachricht editieren (oder löschen, wenn du willst)
            try {
                const m = await channel.messages.fetch(dropMessageId);
                await m.edit("⌛ **Drop abgelaufen!** (nicht geclaimt)");
                // oder: await m.delete();
            } catch (_) {}

            dropMessageId = null;
            dropExpireTimer = null;
        }
    }, 10 * 60 * 1000);

    dropLock = false;
}

/* ========================
   DROP SCHEDULER (ALLE 30 MINUTEN)
======================== */

const DROP_INTERVAL = 30 * 60 * 1000;

/* ========================
   READY
======================== */

client.once("ready", () => {
    console.log(`🤖 Bot online als ${client.user.tag}`);
    loadUserData();

    setInterval(async () => {
        if (currentDrop) return;

        const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        await startDrop(channel, true);
    }, DROP_INTERVAL);
});


/* ========================
   COMMAND HANDLER
======================== */

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const data = getUserData(userId);
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    
    if (command === ".stats") {
        return statsCommand.run(message, data);
    }

    if (command === ".stp") {
        return stpCommand.run(message, args);
    }

    if (command === ".coinflip") {
        return coinflipCommand.run(message, args);
    }

    if (command === ".roulette") {
        return rouletteCommand.run(message, args, data, updateUserRank);
    }

    if (command === ".hot") {
        return hotCommand.run(message, args, data, updateUserRank);
    }

    if (command === ".crash") {
        return crashCommand.run(message, args, data, {activeCrashGameRef, updateUserRank});
    }

    if (command === ".cashout") {
        return crashCommand.cashout(message, data, {activeCrashGameRef, updateUserRank});
    }

    if (command === ".gift") {
        return giftCommand.run(message, args, data, { updateUserRank });
    }

    if (command === ".ts") {
        message.reply("Tim stinkt!")
    }

    /* ========================
       .HELP
    ======================== */
    if (command === ".help") {
    const embed = new EmbedBuilder()
        .setTitle("📜 Hilfe – Verfügbare Commands")
        .setColor(0x1abc9c)
        .setDescription("Nutze die folgenden Commands, um Punkte zu sammeln, zu spielen oder den Server zu verwalten.")
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


    /* ========================
       .DAILY
    ======================== */
    if (command === ".daily") {
        const now = new Date();
        const today = getTodayString();

        if (data.lastDaily === today) {
            const remaining = getTomorrowMidnight() - now;
            return message.reply(`⏳ Nächstes Daily in **${formatDuration(remaining)}**`);
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        data.streak = data.lastDaily === yesterdayStr ? data.streak + 1 : 1;

        let reward = 10 + (data.streak - 1) * 2;
        if (now.getDay() === 0) reward *= 2;

        data.points += reward;
        data.lastDaily = today;

        // Rang aktualisieren
        if (message.member) await updateUserRank(message.member, data.points);

        message.reply(
            `🎁 **Daily erhalten!**\n` +
            `➕ ${reward} Punkt(e)\n🔥 Streak: ${data.streak}\n💰 Kontostand: ${data.points}`
        );

        saveUserData();
    }

    /* ========================
       .Punkt(e)
    ======================== */
    if (command === ".punkte") {
        const target = message.mentions.users.first() || message.author;
        if (!userData.has(target.id)) userData.set(target.id, { points: 0, lastDaily: null, streak: 0 });
        message.reply(`💰 **${target.username}** hat **${userData.get(target.id).points} Punkt(e)**`);
    }

    /* ========================
       .LEADERBOARD
    ======================== */
    if (command === ".leaderboard") {
        const sorted = [...userData.entries()]
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, 10);

        if (sorted.length === 0) return message.reply("📭 Noch keine Punkt(e) vorhanden.");

        let text = "🏆 **Leaderboard – Top 10**\n\n";

        for (let i = 0; i < sorted.length; i++) {
            const [id, data] = sorted[i];
            const user = await client.users.fetch(id).catch(() => null);
            text += `${i + 1}. **${user ? user.username : "Unbekannt"}** – ${data.points} Punkt(e)\n`;
        }

        message.channel.send(text);
    }

    /* ========================
       ADMIN .ADD / .REMOVE
    ======================== */
    if ((command === ".add" || command === ".remove") && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[2]);
        if (!targetUser || isNaN(amount)) return message.reply("❌ Usage: .add @User [Punkt(e)] oder .remove @User [Punkt(e)]");

        if (!userData.has(targetUser.id)) userData.set(targetUser.id, { points: 0, lastDaily: null, streak: 0 });
        const targetData = userData.get(targetUser.id);

        if (command === ".add") targetData.points += amount;
        else targetData.points = Math.max(targetData.points - amount, 0);

        // Rang aktualisieren
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) await updateUserRank(targetMember, targetData.points);

        message.reply(`✅ Neuer Stand von ${targetUser.username}: ${targetData.points} Punkt(e)`);
        saveUserData();
    }

    /* ========================
       .KAMIKAZE
    ======================== */
    if (command === ".kamikaze") {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply("❌ Bitte erwähne einen User!");

        if (!userData.has(targetUser.id)) userData.set(targetUser.id, { points: 0, lastDaily: null, streak: 0 });
        const targetData = userData.get(targetUser.id);

        if (data.points < 100 || targetData.points < 100) return message.reply("❌ Beide brauchen mindestens 100 Punkt(e)!");

        data.points -= 100;
        targetData.points -= 100;

        // Rang aktualisieren
        if (message.member) await updateUserRank(message.member, data.points);
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) await updateUserRank(targetMember, targetData.points);

        message.reply(`💥 Kamikaze ausgeführt!\n**${message.author.username}**: ${data.points} Punkt(e)\n**${targetUser.username}**: ${targetData.points} Punkt(e)`);
        saveUserData();
    }

    /* ========================
       .RANKS
    ======================== */
    if (command === ".ranks") {
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

    /* ========================
       DROP claim
    ======================== */
    if (command === ".drop") {
        if (!currentDrop || currentDrop.claimed) return; // Kein Drop aktiv

        const points = Math.floor(Math.random() * 21) + 10; // 10-30 Punkt(e)
        data.points += points;
        currentDrop.claimed = true;
        saveUserData();

        if (message.member) await updateUserRank(message.member, data.points);

        // NEW: Ablauf-Timer stoppen, weil geclaimt
        if (dropExpireTimer) {
            clearTimeout(dropExpireTimer);
            dropExpireTimer = null;
        }
        dropMessageId = null;

        await message.reply(`🎉 Glückwunsch! Du hast den Drop geclaimt und **${points} Punkt(e)** erhalten!`);
        currentDrop = null;
    }

    /* ========================
       Adminstart
    ======================== */
    if (command === ".startdrop" && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
        if (!channel) return message.reply("❌ Drop-Channel nicht gefunden!");
        await startDrop(channel, true);
    }
});

client.login(process.env.DISCORD_TOKEN);