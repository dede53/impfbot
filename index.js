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

bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const plz = match[1] || 37073;

    bot.sendMessage(chatId, "Du wirst benachrichtigt sobald ein Termin frei ist!");
    registerUser(chatId, plz);
    saveNewUser(chatId, plz);
});

bot.onText(/\/stop(.*)/, (msg, match) => {
    bot.sendMessage(msg.chat.id, "Du wirst nicht weiter benachrichtigt!");
    clearInterval(requests[msg.chat.id]);
    delete config[msg.chat.id];
    fs.writeFileSync(configFile, JSON.stringify(config));
});

function registerUser(chatId, plz) {
    checkAppointment(chatId, plz);
    requests[chatId] = setInterval(function () {
        checkAppointment(chatId, plz);
    }, 30 * 1000);
}

function checkAppointment(chatId, plz) {
    const url = "https://www.impfportal-niedersachsen.de/portal/rest/appointments/findVaccinationCenterListFree/" + plz;
    axios.get(url).then(function (response) {
        let result = response.data.resultList[0];
        if (result.outOfStock == false) {
            let message = "Es ist ein Impftermin verfügbar!\n Es handelt sich um Impfstoff von " + result.vaccineName;
            if(result.freeSlotSizeOnline > 1){
                message = "Es sind " + result.freeSlotSizeOnline + " Impftermine verfügbar!\n Es handelt sich um Impfstoff von " + result.vaccineName;
            }

            console.log(new Date().toLocaleString(), message);
            bot.sendMessage(chatId, message);
        } else {
            console.log(new Date().toLocaleString(), "Leider kein Termin verfügbar für ", chatId);
        }
    }).catch((error) => {
        console.log(error);
    });
}

function saveNewUser(chatId, plz) {
    config[chatId] = plz;
    fs.writeFileSync(configFile, JSON.stringify(config));
}