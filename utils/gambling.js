function calculateGamblingXP(einsatz, punkte) {
    let xp;
    if (punkte > 100) {
        xp = (einsatz / punkte) * 10;
    } else {
        xp = einsatz / 10;
    }
    return xp;
}

function getGamblingXPForNextLevel(level) {
    return Math.pow(1.2, level) * 100;
}

function addGamblingXP(userData, xp) {
    if (!userData.gambling) {
        userData.gambling = { xp: 0, level: 1 };
    }

    userData.gambling.xp += xp;

    let leveledUp = false;
    while (userData.gambling.xp >= getGamblingXPForNextLevel(userData.gambling.level)) {
        userData.gambling.xp = userData.gambling.xp - getGamblingXPForNextLevel
        leveledUp = true;
    }

    return leveledUp;
}

module.exports = {
    calculateGamblingXP,
    getGamblingXPForNextLevel,
    addGamblingXP
};