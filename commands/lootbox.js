"use strict";

const { getUserData, saveUserData } = require("../data/userData");
const lootTables = require("../config/items");

// Item anhand der chance rollen (chance muss NICHT auf 100 summieren)
function rollItem(table) {
  if (!Array.isArray(table) || table.length === 0) return null;

  const clean = table.filter(
    (it) =>
      it &&
      typeof it.id === "string" &&
      typeof it.name === "string" &&
      typeof it.chance === "number" &&
      it.chance > 0
  );

  if (clean.length === 0) return null;

  const total = clean.reduce((acc, it) => acc + it.chance, 0);
  if (total <= 0) return null;

  const roll = Math.random() * total;
  let sum = 0;

  for (const it of clean) {
    sum += it.chance;
    if (roll <= sum) return it;
  }

  return clean[clean.length - 1] || null;
}

module.exports = {
  name: ".lootbox",

  async run(message, args) {
    try {
      console.log("✅ Command .lootbox aufgerufen", args);

      const type = args[1]?.toLowerCase();
      console.log("🎲 Lootbox-Typ:", type);

      if (!["rare", "epic", "legendary"].includes(type)) {
        return message.reply("❌ Nutzung: `.lootbox rare | epic | legendary`");
      }

      const userId = message.author.id;

      // Userdata absichern
      const data = getUserData(userId) || {};
      if (typeof data.points !== "number") data.points = 0;

      // Items + Keys Struktur absichern
      if (!data.items || typeof data.items !== "object") {
        data.items = { rareKey: 0, epicKey: 0, legendaryKey: 0, items: {} };
      }
      if (typeof data.items.rareKey !== "number") data.items.rareKey = 0;
      if (typeof data.items.epicKey !== "number") data.items.epicKey = 0;
      if (typeof data.items.legendaryKey !== "number") data.items.legendaryKey = 0;

      if (!data.items.items || typeof data.items.items !== "object") {
        data.items.items = {};
      }

      console.log("👤 User-Data:", data);

      const keyMap = { rare: "rareKey", epic: "epicKey", legendary: "legendaryKey" };
      const keyName = keyMap[type];

      // Key vorhanden?
      if (data.items[keyName] <= 0) {
        return message.reply(`❌ Du hast keinen **${type} Key**.`);
      }

      // LootTable laden
      const lootTable = lootTables?.[type];
      console.log("📦 LootTable geladen:", lootTable);

      if (!Array.isArray(lootTable) || lootTable.length === 0) {
        return message.reply("❌ Loottable ist leer oder nicht definiert!");
      }

      // Rollen (erst rollen, dann key abziehen -> verhindert Key-Verlust bei Fehlern)
      const reward = rollItem(lootTable);
      console.log("🎯 Gerolltes Item:", reward);

      if (!reward || !reward.id) {
        return message.reply("❌ Fehler beim Loot-Roll. Bitte versuche es erneut.");
      }

      // Key abziehen
      data.items[keyName]--;
      console.log(`🔑 Key ${keyName} abgezogen, neue Anzahl: ${data.items[keyName]}`);

      // Inventar erhöhen (WICHTIG: in data.items.items speichern)
      if (typeof data.items.items[reward.id] !== "number") {
        data.items.items[reward.id] = 0;
      }
      data.items.items[reward.id]++;

      // Bonuspunkte nur epic & legendary
      let bonusPoints = 0;
      if (type !== "rare") {
        bonusPoints = Math.floor(Math.random() * 21) + 10; // 10..30
        data.points += bonusPoints;
      }

      saveUserData();
      console.log("💾 User-Data gespeichert");

      return message.reply(
        `🎁 **${type.toUpperCase()} Lootbox geöffnet!**\n\n` +
          `🔑 Key verbraucht\n` +
          `📦 Item erhalten: **${reward.name}**` +
          (bonusPoints ? `\n💰 Bonus: **+${bonusPoints} Punkte**` : "")
      );
    } catch (err) {
      console.error("❌ Lootbox Command Error:", err);
      return message.reply("❌ Interner Fehler im Lootbox-Command. Bitte später erneut versuchen.");
    }
  },
};