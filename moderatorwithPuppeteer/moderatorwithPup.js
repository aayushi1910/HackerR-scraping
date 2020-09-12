let fs = require('fs');
let puppeteer = require('puppeteer');

let cfile = process.argv[2];
let userToAdd = process.argv[3];

(async function () {
    try{
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            slowMo: 50,
            args: ['--start-maximized', '--disable-notifications']
        });
    
        let credentials = await fs.promises.readFile(cfile, 'utf-8');
        let cred = JSON.parse(credentials);
        let user = cred.user;
        let pwd = cred.pwd;
        let url = cred.url;
    
        let pages = await browser.pages();
        let page = pages[0];
        page.goto(url, {
            waitUntil: 'networkidle0'
        });
        await page.waitForSelector('.auth-button', {
            visible: true
        });
    
        await page.type('#input-1', user);
        await page.type('#input-2', pwd);
        await page.click('.auth-button');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('.profile-menu .ui-icon-chevron-down.down-icon', {
            visible: true
        });
    
        await page.click('.profile-menu .ui-icon-chevron-down.down-icon');
        await page.click('a[data-analytics=NavBarProfileDropDownAdministration]');
    
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('ul.nav-tabs li', {
            visible: true
        })
    
        let manageTabs = await page.$$('ul.nav-tabs li');
        await manageTabs[1].click();
        await page.waitForSelector('ul.nav-tabs', {
            visible : true
        })
    
        let currUrl = page.url();
    
        let qidx = 0;
        let questionElement = await getQuestion(currUrl, qidx, page);
        while (questionElement !== undefined) {
            await handleQuestion(questionElement, page)
            qidx++;
            questionElement = await getQuestion(currUrl, qidx, page);
        }
        await page.close();
    }catch(err){
        console.log(err);
    }
    
})()

async function getQuestion(currUrl, qidx, page) {
    await page.goto(currUrl, {
        waitUntil: 'networkidle0'
    })
    await page.waitForSelector('ul.nav-tabs', {
        visible: true
    })

    let pidx = parseInt(qidx / 10);
    qidx = qidx % 10;

    console.log(pidx + " " +qidx);

    let paginations = await page.$$('.pagination li');
    let nextPage = await paginations[paginations.length - 2];
    let classOnNextPage = await nextPage.evaluate(function (el) {
        return el.getAttribute('class');
    }, nextPage)

    for (let i = 0; i < pidx; i++) {
        if (classOnNextPage !== 'disabled') {
            await nextPage.click();
            await page.waitForSelector('.pagination li', { visible: true })
        
            paginations = await page.$$('.pagination li');
            nextPage = await paginations[paginations.length - 2];
            classOnNextPage = await nextPage.evaluate(function (el) {
                return el.getAttribute('class');
            }, nextPage)
        }else{
            return undefined;
        }  
    }
    
    let ques = await page.$$('.backbone.block-center');
    
    if(qidx<ques.length){
        return ques[qidx];
    }else{
        return undefined;
    }
}

async function handleQuestion(questionElement, page) {
    console.log("------------")
    await questionElement.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForSelector('span.tag', {
        visible: true
    })

    await page.click('.nav-tabs li[data-tab=moderators]');
    await page.waitForSelector('#moderator', {
        visible: true
    })
    await page.type('.input-btn-group input[type=text]', userToAdd);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('.save-challenge');
}