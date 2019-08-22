const Bot = require('./Bot');// this directly imports the Bot/index.js file
const config = require('./Bot/config/puppeter');
var sleep = require('system-sleep');

const run = async () => {
    const bot = new Bot();

    const startTime = Date();

    
    await bot.initPuppeter().then(() => console.log("PUPPETEER INITIALIZED"));

    await bot.visitInstagram().then(() => console.log("BROWSING INSTAGRAM"));    

    await bot.visitHashtagUrl().then(() => console.log("VISITED HASH-TAG URL"));

    //await bot.unFollowUsers();

    console.log("<<< 30 minutos para rodar novamente >>>");

    await bot.closeBrowser().then(() => console.log("BROWSER CLOSED"));

    //const endTime = Date();

    //console.log(`START TIME - ${startTime} / END TIME - ${endTime}`)
    
    
}


for (var i = 0; i < 99999; i++) {
    run().catch((e => console.log(e.message)));    
    sleep(2400000);
}
