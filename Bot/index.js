class InstagramBot {

    constructor() {
        this.firebase_db = require('./db');
        this.config = require('./config/puppeter.json');
    }
    
    async initPuppeter() {
        const puppeteer = require('puppeteer');
        this.browser = await puppeteer.launch({
            headless: this.config.settings.headless,
            args: ['--no-sandbox'],
        });
        this.page = await this.browser.newPage();
        this.page.setViewport({width: 1500, height: 764});
    }

    async visitInstagram() {
        await this.page.goto(this.config.base_url, {timeout: 60000});
        await this.page.waitFor(2500);
        await this.page.click(this.config.selectors.home_to_login_button);
        await this.page.waitFor(2500);
        /* Click on the username field using the field selector*/
        await this.page.click(this.config.selectors.username_field);
        await this.page.keyboard.type(this.config.username);
        await this.page.click(this.config.selectors.password_field);
        await this.page.keyboard.type(this.config.password);
        await this.page.waitFor(4500 + Math.floor(Math.random() * 900));
        await this.page.click(this.config.selectors.login_button);        
        await this.page.waitForNavigation();
        //Close Turn On Notification modal after login
        await this.page.click(this.config.selectors.not_now_button);        
        // Verify news followers
        await this.acceptFollow();
    }

    async acceptFollow(){       
         await this.page.goto(`${this.config.base_url}/accounts/activity/`);
         await this.page.waitFor(1500 + Math.floor(Math.random() * 500)); 
        // await this.page.click(this.config.selectors.Feed_button);
        
         console.log("<<<< Verificando se existe novos seguidores >>>>");
         await this.page.evaluate(() => {
           
            let scripts = this.document.querySelectorAll("div.iTMfC");
            
            scripts.forEach(script => {                
                    let el = script.parentElement.querySelector('button._0mzm-.sqdOP.L3NKy');                
                    if(el != null){
                        if(el.innerHTML=="Seguir"){                    
                            el.click();                   
                        }   
                    }            
            })            

         })
         await this.page.waitFor(4500 + Math.floor(Math.random() * 3900));         
    }

    async visitHashtagUrl() {
        const shuffle = require('shuffle-array');
        let hashTags = shuffle(this.config.hashTags);
        // loop through hashTags
        for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
            console.log('<<<< Explorando as Tags >>>> #' + hashTags[tagIndex]);
            //visit the hash tag url
            await this.page.goto(`${this.config.base_url}/explore/tags/` + hashTags[tagIndex] + '/?hl=en');
            // Loop through the latest 9 posts
            await this._doPostLikeAndFollow(this.config.selectors.hash_tags_base_class, this.page)
            .catch((e) => {
                console.log('<<< Erro ao curtir a postagem: ' + e.message + " >>>");                              
            });
        }
    }


    async _doPostLikeAndFollow (parentClass, page){

        for (let r = 1; r < 4; r++) {//loops through each row
            for (let c = 1; c < 4; c++) {//loops through each item in the row
    
                let br = false;
                //Try to select post
                await page.click(`${parentClass} > div > div > .Nnq7C:nth-child(${r}) > .v1Nh3:nth-child(${c}) > a`)
                    .catch((e) => {
                        console.log(e.message);
                        br = true;
                    });
                await page.waitFor(2250 + Math.floor(Math.random() * 250));//wait for random amount of time
                if (br) continue;//if successfully selecting post continue
    
                //get the current post like status by checking if the selector exist
                let hasEmptyHeart = await page.$(this.config.selectors.post_heart_grey);
                
                // get the current post like is true
                let HeartisLike = await page.$(this.config.selectors.post_heart_red);

                //get the username of the current post
                let username = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.post_username);
                console.log(`Acessando o ${username}`);    
                
                if(HeartisLike == null){
                    //like the post if not already liked. Check against our like ratio so we don't just like all post
                    if (hasEmptyHeart !== null && Math.random() < this.config.settings.like_ratio) {
                        await page.click(this.config.selectors.post_like_button);//click the like button
                        await page.waitFor(10000 + Math.floor(Math.random() * 5000));// wait for random amount of time.
                    }
                }
                else{
                    console.log("Já curtido");
                }
    
                //let's check from our archive if we've follow this user before
                let isArchivedUser = null;
                await this.firebase_db.inHistory(username).then(data => isArchivedUser = data)
                    .catch(() => isArchivedUser = false);
    
                //get the current status of the current user using the text content of the follow button selector
                let followStatus = await page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.post_follow_link);
    
                console.log("Status do seguimento: ", followStatus);
                //If the text content of followStatus selector is Follow and we have not follow this user before
                // Save his name in the list of user we now follow and follow him, else log that we already follow him
                // or show any possible error
                if (followStatus === 'Follow' && !isArchivedUser) {
                    await this.firebase_db.addFollowing(username).then(() => {
                        return page.click(this.config.selectors.post_follow_link);
                    }).then(() => {
                        console.log('<<< Preparando para seguir >>> ' + username);
                        return page.waitFor(1000 + Math.floor(Math.random() * 5000));
                    }).catch((e) => {
                        console.log('<<< Seguindo >>> ' + username);
                        console.log('<<< Erro >>>' + username + ':' + e.message);
                    });
                }
    
                //Closing the current post modal
                await page.click(this.config.selectors.post_close_button)
                    .catch((e) => console.log('<<< Erro, Fechando a postagem >>> ' + e.message));
                //Wait for random amount of time
                await page.waitFor(2250 + Math.floor(Math.random() * 250));
                console.log("------------------------------------------------------------------------------------------------------------------------------------------------");
            }
        }
    };
    
    async unFollowUsers() {
        let date_range = new Date().getTime() - (this.config.settings.unfollow_after_days * 86400000);
    
        // get the list of users we are currently following
        let following = await this.firebase_db.getFollowings();
        let users_to_unfollow = [];
        if (following) {
            const all_users = Object.keys(following);
            // filter our current following to get users we've been following since day specified in config
            users_to_unfollow = all_users.filter(user => following[user].added < date_range);
        }
    
        if (users_to_unfollow.length) {
            for (let n = 0; n < users_to_unfollow.length; n++) {
                let user = users_to_unfollow[n];
                await this.page.goto(`${this.config.base_url}/${user}/?hl=en`);
                await this.page.waitFor(1500 + Math.floor(Math.random() * 500));
    
                let followStatus = await this.page.evaluate(x => {
                    let element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, this.config.selectors.user_unfollow_button);
    
                if (followStatus === 'Following') {
                    console.log('<<< UNFOLLOW USER >>>' + user);
                    //click on unfollow button
                    await this.page.click(this.config.selectors.user_unfollow_button);
                    //wait for a sec
                    await this.page.waitFor(1000);
                    //confirm unfollow user
                    await this.page.click(this.config.selectors.user_unfollow_confirm_button);
                    //wait for random amount of time
                    await this.page.waitFor(20000 + Math.floor(Math.random() * 5000));
                    //save user to following history
                    await this.firebase_db.unFollow(user);
                } else {
                    //save user to our following history
                    this.firebase_db.unFollow(user);
                }
            }
    
        }
    }


    async closeBrowser(){
        await this.browser.close();
    }


}



module.exports = InstagramBot;
