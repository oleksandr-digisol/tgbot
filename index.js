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
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCmBHZugpX3rclL\nw3+81PkU4gl7A6L+3rZxTTd+W3cZYYftq49YCG8GlRQvubjNe4HZ2RMHblEmQX1i\nnYnj50OwivxLU7UgKjJQu35Yn2XuGOnl02QOAvLJU9ZqrDxWI+4bGPiNYmcizr6Y\nHbpNedOF7APZh2ZB8P94cPY5E/ElhteeFeFn+l77k8OwLmRdXRVGZPwkGZTucera\nCchdaA27ahBf4P1QoXwLWyoP5qoUd0CSk0aAcJjIkqzdovEUibNHSm9lhDs2eULj\nf8PfI2jeE+x02j8putqU8dhAY4t5/khd7Wusul27z/OXBZ6x+gcYk9zbUYcyXu90\nBbiCPWCbAgMBAAECggEAEROCbwmFjW1VuDJKsEyjti8t1HZiTJ7x2yObIqcb0AOF\nLMApxV9QtDefVO1ggdpDV/oJCAmj1TCFSiB0L3n5L26MVt8sUTul40H10/3JST1M\nybP9padN+8Fg26YNqrqVYjomTryhaSYk2pasNA3k4PCO0NAph3zXejb8TJCtjDNw\n91vTrSl+5MQsosCYZpMzFGVbLhR1W654I3TzDemytU0Z6uPaH67hg5kBp80mr/ZQ\n9tum2wEToOLoCE06WfABpgpF2+AK2F5SsdbxtD3+5VYDNXvrXZ5H5+x2p0U+K/hy\ng9V3gVYoIRGJadDRPM/MGSZxX8UdmIjL9hoacdGIwQKBgQDcRTYDEa4dsJf+pUYS\nZ76T2scXJi54eh48heLpSUSm9sBZaUq5MnjZIlazRWjGE6mu4vrdq+4k+r0a3Ldh\nAV7xHxIzIzN2qBAuFx2wpgyVIS4ZwOOP/ExtherqE4anCuexBtIWfvX0doXWjMpw\nT3H1wNJhIvmWx16bqSaMCt/uewKBgQDA8mIz5hISpdIh0ncuooDvVwRVWRNs9ZsL\nt0Rvi/a3qIeQwlcI2qLgHDphkcMadQyTMsft1kwLv+oeZSFjhaccAgSqw+Uw2Y9I\nhCpXw3y2hXSYH8/qefew/bIbVugnkYJtGYJtHIno3QS/++e+okr3hU6fS8mz+PsR\nVltzQe7MYQKBgQDXkXx8oG7wa4U1F3ZuSM3AUZoKU7mi+pBg1v7tJGFlrZMtbdhN\nStHuXqbPJ5yUTWYA2+57xul3k1RC18M30mmiPLBJD6gr9epv0Pujh75ErIY7egS7\nQ0Vg4nC2yIk9LXT2USCGF5aJuvzcrkjohTeYNS8vFVWCdHdoi7BH2dSxxQKBgGzU\nyvuHHE6UZbBaLIuLcbqOlI0nj0N4TZoQJ3PbuK/jSYQnejwuRoyun2eFdk0oFI26\nqPbIV2CRQZcfZ/Pg4V906/j+QfqJ3L4EfnW+eEvjft6HoxkY7tNQZfPx00TuWGj9\naInu/QLyF8nKZu8qT6rJ8Iz9jKoNGGCxGygp2m5BAoGBAJcp7c2Dl1Vd1ieSlLWK\nIZwH51lZ4PZtZfydZF96g7dE18VWpFFnWWVELobI5h8u0JkPxJepdOR6R8LEBtIj\nTyLvbNyMD2l061PM0EoTyn8m3vJLmQw5UvEFHlIbTy0mgQgJtgGySRuFNBCNizQM\nJtyjvM582Odjpyfims/rhORQ\n-----END PRIVATE KEY-----\n",
    });
    await doc.loadInfo();
    sheet = doc.sheetsByIndex[0];
    console.log(sheet.rowCount);
}());

const report = Markup.inlineKeyboard([
    [Markup.button.callback('Переміщення вийськової техніки', 'troops')],
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
