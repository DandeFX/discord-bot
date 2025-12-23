require("dotenv").config();

const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
let activeCrashGame = null;

const {
    calculateGamblingXP,
    getGamblingXPForNextLevel,
    addGamblingXP
} = require("./utils/gambling");

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
    **.crash [Einsatz]** – Cashout vor dem Crash`
    
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
       .GIFT
    ======================== */
    if (command === ".gift") {
        const target = message.mentions.users.first();
        const amount = parseInt(args[2]);

        if (!target || isNaN(amount) || amount <= 0) return message.reply("❌ .gift @User [Punkt(e)]");
        if (data.points < amount) return message.reply("❌ Nicht genug Punkt(e)");

        if (!userData.has(target.id)) userData.set(target.id, { points: 0, lastDaily: null, streak: 0 });

        data.points -= amount;
        userData.get(target.id).points += amount;

        // Rang aktualisieren
        if (message.member) await updateUserRank(message.member, data.points);
        const targetMember = await message.guild.members.fetch(target.id).catch(() => null);
        if (targetMember) await updateUserRank(targetMember, userData.get(target.id).points);

        message.reply(`🎁 ${amount} Punkt(e) an **${target.username}** verschenkt`);
        saveUserData();
    }

    /* ========================
       .COINFLIP
    ======================== */
    if (command === ".coinflip") {
        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) return message.reply("❌ .coinflip [Einsatz]");
        if (data.points < bet) return message.reply("❌ Nicht genug Punkt(e)");

    // 🎰 XP
    const xp = calculateGamblingXP(bet, data.points);
    const leveledUp = addGamblingXP(data, xp);

    data.points -= bet;

    if (Math.random() < 0.5) {
        data.points += bet * 2;
        message.reply(`🪙 **Gewonnen!** Neuer Stand: ${data.points}`);
    } else {
        message.reply(`🪙 **Verloren!** Neuer Stand: ${data.points}`);
    }

    if (leveledUp) {
        message.channel.send(`🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`);
    }

    if (message.member) await updateUserRank(message.member, data.points);
    saveUserData();
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
       .ROULETTE
    ======================== */
    if (command === ".roulette") {
        if (!args[1] || !args[2]) return message.reply("❌ Usage: .roulette [Einsatz] [Zahl/rot/schwarz/grün]");
        
        const bet = parseInt(args[1]);
        const choice = args[2].toLowerCase();

        if (isNaN(bet) || bet <= 0) return message.reply("❌ Ungültiger Einsatz!");
        if (data.points < bet) return message.reply("❌ Du hast nicht genug Punkt(e)!");

        const numbers = Array.from({ length: 37 }, (_, i) => i);
        const colors = {
            rot: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
            schwarz: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
            grün: [0]
        };

        const result = numbers[Math.floor(Math.random() * numbers.length)];
        let win = false;
        let multiplier = 0;

        if (choice === "rot" || choice === "schwarz") {
            if (colors[choice].includes(result)) {
                win = true;
                multiplier = 2;
            }
        } else if (choice === "grün") {
            if (result === 0) {
                win = true;
                multiplier = 35;
            }
        } else {
            const chosenNumber = parseInt(choice);
            if (!isNaN(chosenNumber) && chosenNumber >= 0 && chosenNumber <= 36) {
                if (chosenNumber === result) {
                    win = true;
                    multiplier = 35;
                }
            } else {
                return message.reply("❌ Ungültige Zahl! 0-36 oder rot/schwarz/grün erlaubt.");
            }
        }

        let wonPoints = 0;

        if (win) wonPoints = bet * multiplier;
            data.points += wonPoints;

        // 🎰 XP
        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        data.points -= bet;

        if (leveledUp) {
        message.channel.send(`🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`);
        }   


        // Rang aktualisieren
        if (message.member) await updateUserRank(message.member, data.points);

        message.reply(`🎲 Roulette Ergebnis: **${result}**! ${win ? `Gewonnen: ${wonPoints} Punkt(e) 🎉` : "Verloren 😢"}. Dein aktueller Stand: **${data.points} Punkt(e)**`);
        saveUserData();
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

    /* ========================
    .HOT (Heads or Tails)
    ======================== */
    if (command === ".hot") {
        const bet = parseInt(args[1]);
        const choice = args[2]?.toLowerCase();

        if (isNaN(bet) || bet <= 0) {
            return message.reply("❌ Usage: `.hot [Einsatz] [heads/tails]`");
        }

        if (!choice || (choice !== "heads" && choice !== "tails")) {
            return message.reply("❌ Bitte wähle **heads** oder **tails**.");
        }

        if (data.points < bet) {
            return message.reply("❌ Du hast nicht genug Punkt(e)!");
        }

        const xp = calculateGamblingXP(bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        data.points -= bet;

        const result = Math.random() < 0.5 ? "heads" : "tails";


        if (choice === result) {
            const win = bet * 2;
            data.points += win;

            // Rang aktualisieren
            if (message.member) await updateUserRank(message.member, data.points);

            message.reply(
                `🪙 **Heads or Tails**\n` +
                `Deine Wahl: **${choice}**\n` +
                `Ergebnis: **${result}**\n\n` +
                `🎉 **Gewonnen!** +${win} Punkt(e)\n` +
                `💰 Neuer Stand: **${data.points} Punkt(e)**`
            );
        } else {
            // Rang aktualisieren
            if (message.member) await updateUserRank(message.member, data.points);

            message.reply(
                `🪙 **Heads or Tails**\n` +
                `Deine Wahl: **${choice}**\n` +
                `Ergebnis: **${result}**\n\n` +
                `❌ **Verloren!** -${bet} Punkt(e)\n` +
                `💰 Neuer Stand: **${data.points} Punkt(e)**`
            );
        }

        if (leveledUp) {
            message.channel.send(`🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`);
        }


        saveUserData();
    }

   /* ========================
    .CRASH / .CASHOUT
    ======================== */
if (command === ".crash") {
    if (activeCrashGame) return message.reply("❌ Es läuft bereits ein Crash-Spiel.");

    const bet = parseInt(args[1]);
    if (isNaN(bet) || bet <= 0) return message.reply("❌ .crash [Einsatz]");
    if (data.points < bet) return message.reply("❌ Nicht genug Punkte!");

    // Einsatz abziehen
    data.points -= bet;
    saveUserData();
    // Crashpoint skaliert Win/Lose
    const crashPoint = +(Math.pow(Math.random(), 5) * 9 + 1).toFixed(2);
    let multiplier = 1.0;

    const crashMsg = await message.reply(
        `🚀 **CRASH gestartet!**\nEinsatz: ${bet} Punkte\n📈 Multiplikator: 1.00x\n💸 Tippe .cashout, um auszuzahlen`
    );

    activeCrashGame = {
        userId,
        bet,
        multiplier,
        crashPoint,
        crashed: false,
        cashedOut: false,
        message: crashMsg,
        interval: null,
        editing: false
    };

    const growthFactor = 1.04; 
    activeCrashGame.interval = setInterval(async () => {
        const game = activeCrashGame;
        if (!game || game.cashedOut || game.crashed || game.editing) return;

        // Exponentielles Wachstum
        game.multiplier = +(game.multiplier * growthFactor).toFixed(2);

        // Crash prüfen
        if (game.multiplier >= game.crashPoint) {
            game.crashed = true;
            clearInterval(game.interval);

            await game.message.edit(
                `💥 **CRASH bei ${game.crashPoint.toFixed(2)}x!** ❌ Einsatz verloren 😢\n` +
                `Der Crashpoint dieses Spiels war: **${game.crashPoint.toFixed(2)}x**`
            ).catch(() => {});

            activeCrashGame = null;
            return;
        }

        game.editing = true;
        await game.message.edit(
            `🚀 **CRASH läuft**\nEinsatz: ${game.bet} Punkte\n📈 Multiplikator: **${game.multiplier.toFixed(2)}x**\n💸 .cashout zum Auszahlen`
        ).catch(() => {});
        game.editing = false;

    }, 800);
}

    if (command === ".cashout") {
        const game = activeCrashGame;
        if (!game) return message.reply("❌ Aktuell läuft kein Crash-Spiel.");
        if (game.userId !== userId) return message.reply("❌ Du spielst dieses Crash-Spiel nicht.");
        if (game.cashedOut || game.crashed) return message.reply("❌ Zu spät zum Auscashen!");

        game.cashedOut = true;
        clearInterval(game.interval);

        const finalMultiplier = Math.min(game.multiplier, game.crashPoint);
        const win = Math.floor(game.bet * finalMultiplier);

        data.points += win;

        if (!data.highestCrash || finalMultiplier > data.highestCrash) {
            data.highestCrash = finalMultiplier;
        }

        // 🎰 XP für Crash gewinnen
        const xp = calculateGamblingXP(game.bet, data.points);
        const leveledUp = addGamblingXP(data, xp);

        if (leveledUp) {
            message.channel.send(`🧠 Gambling Addiction **Level ${data.gambling.level}** erreicht!`);
        }

        saveUserData();
        if (message.member) await updateUserRank(message.member, data.points);

        await game.message.edit(
            `💸 **CASHOUT ERFOLGREICH!**\n📈 Multiplikator: **${finalMultiplier.toFixed(2)}x**\n🎉 Gewinn: **${win} Punkte**\n` +
            `Der Crashpoint dieses Spiels war: **${game.crashPoint.toFixed(2)}x**`
        ).catch(() => {});

        activeCrashGame = null;
    }
});

client.login(process.env.DISCORD_TOKEN);