require('dotenv').config();
const axios = require('axios');
const { Telegraf, Markup, Scenes, session } = require('telegraf');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');

const bot = new Telegraf(process.env.TOKEN);
const userAnswers = {};
const id = '1CA2REYgYQCe0iMfAlJNCiNLGFHfiKh78wYA9DLyjtyY';
let sheet;

(async function() {
    const doc = new GoogleSpreadsheet(id);
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.PRIVATE_KEY,
    });
    await doc.loadInfo();
    sheet = doc.sheetsByIndex[0];
    console.log(sheet.rowCount);
}());

const report = Markup.inlineKeyboard([
    [Markup.button.callback('Переміщення військової техніки', 'troops')],
    [Markup.button.callback('Злочини проти мирного населення', 'crime')],
    [Markup.button.callback('Інша інформація', 'another')],
]);

const region = Markup.inlineKeyboard([
    [Markup.button.callback('Запорізька', 'Запорізька')],
    [Markup.button.callback('Херсонська', 'Херсонська')],
    [Markup.button.callback('Миколаївська', 'Миколаївська')],
]);

const restart = Markup.inlineKeyboard([
    [Markup.button.callback('Додати ще', 'addMore')],
]);

const addRegion = (ctx) => {
    userAnswers.region = ctx.update.callback_query.data;
    ctx.scene.enter('cityScene');
    return ctx.scene.leave();
};


const infoScene = new Scenes.BaseScene('infoScene');
infoScene.enter((ctx) => ctx.reply('Надайте, будь ласка, інформацію:'))
infoScene.on('message', (ctx) => {
    userAnswers.report = ctx.message.text;
    ctx.scene.enter('regionScene');
    return ctx.scene.leave();
});

const mediaScene = new Scenes.BaseScene('mediaScene');
mediaScene.enter((ctx) => ctx.reply('Додайте фото- або відео- файл:'))
mediaScene.on('photo', async (doc) => {
    try {
        const photosArr = doc.update.message.photo;
        const fileId = photosArr[photosArr.length - 1].file_id;
        const res = await axios.get(
          `https://api.telegram.org/bot${process.env.TOKEN}/getFile?file_id=${fileId}`
        );
        const filePath = res.data.result.file_path;
        const downloadURL = 
          `https://api.telegram.org/file/bot${process.env.TOKEN}/${filePath}`;
        userAnswers.report = downloadURL;
        doc.scene.enter('regionScene');
        return doc.scene.leave();
    } catch (e) {
        console.log(e);
    }
});

const regionScene = new Scenes.BaseScene('regionScene');
regionScene.enter((ctx) => ctx.reply('Область до якої належить інформація', region));
regionScene.action('Запорізька', async(ctx) => addRegion(ctx));
regionScene.action('Херсонська', async(ctx) => addRegion(ctx));
regionScene.action('Миколаївська', async(ctx) => addRegion(ctx));

const cityScene = new Scenes.BaseScene('cityScene');
cityScene.enter((ctx) => ctx.reply('Вкажіть населений пункт'));
cityScene.on('message', (ctx) => {
    userAnswers.city = ctx.message.text;
    ctx.scene.enter('timeScene');
    return ctx.scene.leave();
});

const timeScene = new Scenes.BaseScene('timeScene');
timeScene.enter((ctx) => ctx.reply('Вкажіть дату та час'));
timeScene.on('message', async(ctx) => {
    try {
        userAnswers.time = ctx.message.text;
        await sheet.addRow(userAnswers);
        ctx.reply('Дякуємо, додано! Слава Україні!', restart);
    } catch(e) {
        ctx.reply('Щось пішло не так... спробуйте ще раз', restart);
    }
    return ctx.scene.leave();
});

const stage = new Scenes.Stage([infoScene, mediaScene, regionScene, cityScene, timeScene]);

bot.use(session())
bot.use(stage.middleware())

bot.start(async(ctx) => {
    ctx.reply('Ваше ім\'я або позивний')
});

bot.on('message', async (ctx) => {
    userAnswers.name = ctx.message.text;
    ctx.reply('Про що доповідаємо?', report);
});
bot.action('troops', (ctx) => {
    userAnswers.typeOfReport = 'техніка';
    ctx.scene.enter('mediaScene');
});
bot.action('crime', (ctx) => {
    userAnswers.typeOfReport = 'злочини';
    ctx.scene.enter('infoScene')
});
bot.action('another', (ctx) => {
    userAnswers.typeOfReport = 'інше';
    ctx.scene.enter('infoScene')
});
bot.action('addMore', (ctx) => {
    ctx.reply('Про що доповідаємо?', report);
});

bot.launch();
