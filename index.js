require("dotenv").config();

const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const activeCrashGameRef = { game: null };

// =====================
// DATA & PET PAYOUT
// =====================
const startPetPayoutLoop = require("./utils/petPayout");

const {
    loadUserData,
    saveUserData,
    getUserData
} = require("./data/userData");

// =====================
// COMMANDS
// =====================
const statsCommand = require("./commands/stats");
const stpCommand = require("./commands/stp");
const coinflipCommand = require("./commands/coinflip");
const rouletteCommand = require("./commands/roulette");
const hotCommand = require("./commands/hot");
const crashCommand = require("./commands/crash");
const giftCommand = require("./commands/gift");
const dailyCommand = require("./commands/daily");
const helpCommand = require("./commands/help");
const punkteCommand = require("./commands/punkte");
const leaderboardCommand = require("./commands/leaderboard");
const kamikazeCommand = require("./commands/kamikaze");
const adminPointsCommand = require("./commands/adminPoints");
const lootboxCommand = require("./commands/lootbox");
const inventoryCommand = require("./commands/inventory");
const useCommand = require("./commands/use");
const peterCommand = require("./commands/peter");
const ranksCommand = require("./commands/ranks");
const petCommand = require("./commands/pets");

const RANKS = require("./config/ranks");

// =====================
// CLIENT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =====================
// RANK UPDATE
// =====================
async function updateUserRank(member, points) {
    if (!member?.guild) return;

    const guild = member.guild;
    const targetRank = [...RANKS]
        .sort((a, b) => b.min - a.min)
        .find(r => points >= r.min);

    if (!targetRank) return;

    const newRole = guild.roles.cache.find(r => r.name === targetRank.name);
    if (!newRole) return;

    const allRankRoles = RANKS
        .map(r => guild.roles.cache.find(role => role.name === r.name))
        .filter(Boolean);

    for (const role of allRankRoles) {
        if (member.roles.cache.has(role.id) && role.id !== newRole.id) {
            await member.roles.remove(role).catch(() => {});
        }
    }

    if (!member.roles.cache.has(newRole.id)) {
        await member.roles.add(newRole).catch(() => {});
    }
}

// =====================
// DROPS
// =====================
const DROP_CHANNEL_ID = "1450567294714515549";
const DROP_INTERVAL = 20 * 60 * 1000;

let currentDrop = null;
let dropLock = false;
let dropExpireTimer = null;

function rollDrop() {
    const roll = Math.random() * 100;

    let drop;
    if (roll < 1) {
        drop = { type: "legendary", text: "🌟 Legendär", reward: "legendaryKey" };
    } else if (roll < 11) {
        drop = { type: "epic", text: "💜 Episch", reward: "epicKey" };
    } else if (roll < 31) {
        drop = { type: "rare", text: "💙 Selten", reward: "rareKey" };
    } else {
        drop = { type: "common", text: "⚪ Gewöhnlich", reward: null };
    }

    let requiredClaims = 1;
    if (Math.random() < 0.3) {
        requiredClaims = Math.floor(Math.random() * 3) + 1; // 2–3
    }

    return { drop, requiredClaims };
}

async function startDrop(channel) {
    if (!channel || dropLock || currentDrop) return;
    dropLock = true;

    const rolled = rollDrop();

    currentDrop = {
        drop: rolled.drop,
        requiredClaims: rolled.requiredClaims,
        claimedUsers: new Set()
    };

    const teamText =
        rolled.requiredClaims > 1
            ? `🧑‍🤝‍🧑 **TeamDrop** (${rolled.requiredClaims} Spieler nötig)`
            : `👤 **Solo-Drop**`;

    await channel.send(
        `🎁 **Ein Drop ist erschienen!**\n` +
        `✨ Seltenheit: **${rolled.drop.text}**\n` +
        `${teamText}\n\n` +
        `Tippe \`.drop\` um zu claimen!`
    );

    dropExpireTimer = setTimeout(async () => {
        if (currentDrop) {
            currentDrop = null;
            await channel.send("⌛ **Drop abgelaufen!**");
        }
    }, 10 * 60 * 1000);

    dropLock = false;
}

// =====================
// READY
// =====================
client.once("ready", () => {
    console.log(`🤖 Bot online als ${client.user.tag}`);

    loadUserData();
    startPetPayoutLoop(client, updateUserRank);

    setInterval(async () => {
        if (currentDrop) return;
        const channel = await client.channels.fetch(DROP_CHANNEL_ID).catch(() => null);
        if (channel) await startDrop(channel);
    }, DROP_INTERVAL);
});

// =====================
// MESSAGE HANDLER
// =====================
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const data = getUserData(userId);
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    switch (command) {

        case ".stats": return statsCommand.run(message, data);
        case ".stp": return stpCommand.run(message, args, updateUserRank);
        case ".coinflip": return coinflipCommand.run(message, args, updateUserRank);
        case ".roulette": return rouletteCommand.run(message, args, data, updateUserRank);
        case ".hot": return hotCommand.run(message, args, data, updateUserRank);
        case ".crash": return crashCommand.run(message, args, data, { activeCrashGameRef, updateUserRank });
        case ".cashout": return crashCommand.cashout(message, data, { activeCrashGameRef, updateUserRank });
        case ".gift": return giftCommand.run(message, args, data, { updateUserRank });
        case ".daily": return dailyCommand.run(message, data, { updateUserRank });
        case ".help": return helpCommand.run(message);
        case ".punkte": return punkteCommand.run(message, args);
        case ".leaderboard": return leaderboardCommand.run(message, args, client);
        case ".ranks": return ranksCommand.run(message, args);
        case ".kamikaze": return kamikazeCommand.run(message, args, { updateUserRank });
        case ".add":
        case ".remove": return adminPointsCommand.run(message, args, { updateUserRank });
        case ".lootbox": return lootboxCommand.run(message, args);
        case ".inventory": return inventoryCommand.run(message);
        case ".use": return useCommand.run(message, args);
        case ".peter": return peterCommand.run(message);
        case ".pet": return petCommand.run(message, args);

        case ".startdrop": {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Kein Recht.");
            }
            if (currentDrop) return message.reply("❌ Drop läuft bereits.");
            await startDrop(message.channel);
            return message.reply("✅ Drop gestartet.");
        }

        case ".drop": {
            if (message.channel.id !== DROP_CHANNEL_ID) return;
            if (!currentDrop) return message.reply("❌ Kein aktiver Drop.");
            if (currentDrop.claimedUsers.has(userId))
                return message.reply("❌ Bereits geclaimt.");

            currentDrop.claimedUsers.add(userId);

            const remaining = currentDrop.requiredClaims - currentDrop.claimedUsers.size;
            if (remaining > 0) {
                return message.reply(`✅ Claim registriert (${remaining} fehlen noch)`);
            }

            // 🎉 AUSZAHLUNG
            let rewardLines = [];

            for (const uid of currentDrop.claimedUsers) {
                const userData = getUserData(uid);
                if (!userData.items) {
                    userData.items = { rareKey: 0, epicKey: 0, legendaryKey: 0 };
                }

                const points = Math.floor(Math.random() * 21) + 10;
                userData.points += points;

                let line = `👤 <@${uid}> → 💰 +${points} Punkte`;

                if (currentDrop.drop.reward) {
                    userData.items[currentDrop.drop.reward]++;
                    line += ` | 🔑 +1 ${currentDrop.drop.reward}`;
                }

                rewardLines.push(line);

                const member = message.guild.members.cache.get(uid);
                if (member) await updateUserRank(member, userData.points);
            }

            saveUserData();

            await message.channel.send(
                `🎉 **Drop erhalten!**\n` +
                `✨ Seltenheit: ${currentDrop.drop.text}\n\n` +
                rewardLines.join("\n")
            );

            currentDrop = null;
            clearTimeout(dropExpireTimer);
            dropExpireTimer = null;
            break;
        }
    }
});

client.login(process.env.DISCORD_TOKEN);