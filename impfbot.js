require('dotenv').config();
const axios = require('axios').default;
const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
let config = {};
let requests = {};
const configFile = "config.json";


if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile));
    Object.keys(config).forEach(user => {
        registerUser(user, config[user]);
    });
} else {
    fs.writeFileSync(configFile, "{}");
}

bot.onText(new RegExp(/\/start(.*)/), (msg, match) => {
    const chatId = msg.chat.id;
    let plz = parseInt(match[1].trim()) || 37073;
    if (isNaN(plz)) {
        plz = 37073;
    }
    bot.sendMessage(chatId, "Du wirst benachrichtigt sobald ein Termin in PLZ-" + plz + " frei ist!\nMöchtest du die Stadt ändern, dann führe /start gefolgt von deiner Postleitzahl aus. Z.B.: /start 12345");
    registerUser(chatId, plz);
    saveNewUser(chatId, plz);
});

bot.onText(new RegExp(/\/stop(.*)/), (msg, match) => {
    const chatId = msg.chat.id;
    unregisterUser(chatId);
    bot.sendMessage(chatId, "Du wirst nicht weiter benachrichtigt!");
});

bot.onText(new RegExp(/\/restart(.*)/), (msg, match) => {
    if (config[msg.chat.id]) {
        bot.sendMessage(msg.chat.id, "Du wirst wieder benachrichtigt!");
        registerUser(msg.chat.id, config[msg.chat.id]);
    } else {
        bot.sendMessage(msg.chat.id, "Du musst den Service erst wieder aktivieren mit /start und deiner Postleitzahl");
    }
});

function registerUser(chatId, plz) {
    log(chatId, "@", plz, "Start");
    checkAppointment(chatId, plz);
    clearInterval(requests[chatId]);
    requests[chatId] = setInterval(function () {
        checkAppointment(chatId, plz);
    }, 30 * 1000);
}

function unregisterUser(chatId) {
    log(chatId, "@", "Stop");
    clearInterval(requests[chatId]);
    delete config[chatId];
    fs.writeFileSync(configFile, JSON.stringify(config));
}

function checkAppointment(chatId, plz) {
    const url = "https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/" + plz;
    axios.get(url).then(function (response) {
        try {
            let result = response.data.resultList[0];
            if (result.outOfStock == false) {
                let message = "In " + result.city + " ist ein Impftermin verfügbar!\nEs handelt sich um Impfstoff von " + result.vaccineName + ".\nDu wirst nicht weiter benachrichtigt. Sende /restart um wieder informiert zu werden.";
                if (result.freeSlotSizeOnline > 1) {
                    message = "In " + result.city + " sind " + result.freeSlotSizeOnline + " Impftermine verfügbar!\nEs handelt sich um Impfstoff von " + result.vaccineName + ". \nDu wirst nicht weiter benachrichtigt. Sende /restart um wieder informiert zu werden.";
                }
                log(chatId, "@", plz, "verfügbar");
                bot.sendMessage(chatId, message);
                clearInterval(requests[chatId]);
            } else {
                log(chatId, "@", plz, "nicht verfügbar");
            }
        } catch (e) {
            log(e);
            log(resonse.data);
        }
    }).catch((error) => {
        log(error);
    });
}

function saveNewUser(chatId, plz) {
    config[chatId] = plz;
    fs.writeFileSync(configFile, JSON.stringify(config));
}

function log(...msg) {
    console.log(new Date().toLocaleString(), msg.toString().replace(/,/g, " "));
}