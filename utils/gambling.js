function getGamblingXPForNextLevel(level) {
    return 100 + (level - 1) * 50;
}

function calculateGamblingXP(einsatz, punkte) {
    if (punkte > 100) {
        return (einsatz / punkte) * 10;
    }
    return einsatz / 10;
}

function addGamblingXP(data, xp) {
    if (!data.gambling) {
        data.gambling = { xp: 0, level: 1 };
    }

    // 🔒 Zwang zu Numbers
    data.gambling.xp = Number(data.gambling.xp) || 0;
    data.gambling.level = Number(data.gambling.level) || 1;
    xp = Number(xp) || 0;

    data.gambling.xp += xp;

    let leveledUp = false;

    while (
        data.gambling.xp >= getGamblingXPForNextLevel(data.gambling.level)
    ) {
        data.gambling.xp -= getGamblingXPForNextLevel(data.gambling.level);
        data.gambling.level += 1;
        leveledUp = true;
    }

    return leveledUp;
}

function getGamblingXPForNextLevel(level) {
    return Math.round(Math.pow(1.2, level) * 100);
}

module.exports = {
    calculateGamblingXP,
    getGamblingXPForNextLevel,
    addGamblingXP
};