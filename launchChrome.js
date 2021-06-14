const {Builder, By} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fsPromise = require("fs/promises");
const fs = require("fs");
const path = require("path");

module.exports = {
    async init(link) {
        let options = new chrome.Options();
        options.setChromeBinaryPath(process.env.CHROME_BINARY_PATH);
        let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH)

        //Below arguments are critical for Heroku deployment
        options.addArguments("--headless");
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments('--disable-dev-shm-usage');


        const driver = new Builder().forBrowser("chrome")
        .setChromeOptions(options)
        .setChromeService(serviceBuilder).build();
        await driver.get(link);
        const mainWindow = await driver.getWindowHandle();
        return {driver, mainWindow}
    },
    createFolder(folderName) {
        const storedPath = path.join(__dirname, "images", folderName);
        const isExistFolder = fs.existsSync(storedPath);
        if (! isExistFolder) {
            fs.mkdirSync(storedPath, {recursive: true});
        }
        return storedPath;
    },
    async processDownloadAllChapterComic(comicLink, comicName, imageSelector, listChapterSelector) {
        const initInstance = await this.init(comicLink);
        let selectElement = await initInstance.driver.findElement(By.css(listChapterSelector));

        let listChapter = await selectElement.findElements(By.css("option"));

        if (listChapter.length === 0) 
            return false;
        

        const comicDomain = new URL(comicLink).origin;

        listChapter = [...new Set(listChapter)];

        for (const i in listChapter) {
            let chapterLink = await listChapter[i].getAttribute("value");
            if (chapterLink.startsWith("/")) {
                chapterLink = `${comicDomain}${chapterLink}`;
            }
            const chapter = await listChapter[i].getText();
            await initInstance.driver.executeScript(`window.open('${chapterLink}', '_blank');`);

            const chapterWindowHandle = (await initInstance.driver.getAllWindowHandles())[1];
            await initInstance.driver.switchTo().window(chapterWindowHandle);

            const storedPath = path.join(__dirname, "images", comicName, chapter);
            const isExistFolder = fs.existsSync(storedPath);
            if (! isExistFolder) {
                fs.mkdirSync(storedPath, {recursive: true});
            }
            const imgElement = await initInstance.driver.findElements(By.css(imageSelector));
            if (imgElement.length === 0) 
                return false;
            
            let urls = [];
            for (const index in imgElement) {
                let url = await imgElement[index].getAttribute("src");
                if (url.startsWith("/")) {
                    url = `${comicDomain}${url}`;
                }
                urls.push(url);
            }

            await this.downloadImageByUrl(initInstance.driver, initInstance.mainWindow, urls, storedPath, chapterWindowHandle);
        }

        await initInstance.driver.switchTo().window(initInstance.mainWindow);
        await initInstance.driver.close();

    },
    async processDownloadMultiChapterComic(comicLink, comicName, imageSelector, listChapterSelector, start, end) {
        const initInstance = await this.init(comicLink);
        let selectElement = await initInstance.driver.findElement(By.css(listChapterSelector));

        let listChapter = await selectElement.findElements(By.css("option"));

        if (listChapter.length === 0) 
            return false;
        

        listChapter = listChapter.slice(start, end);

        const comicDomain = new URL(comicLink).origin;
        listChapter = [...new Set(listChapter)];
        for (const i in listChapter) {
            let chapterLink = await listChapter[i].getAttribute("value");
            if (chapterLink.startsWith("/")) {
                chapterLink = `${comicDomain}${chapterLink}`;
            }
            const chapter = await listChapter[i].getText();
            await initInstance.driver.executeScript(`window.open('${chapterLink}', '_blank');`);

            const chapterWindowHandle = (await initInstance.driver.getAllWindowHandles())[1];
            await initInstance.driver.switchTo().window(chapterWindowHandle);

            const storedPath = path.join(__dirname, "images", comicName, chapter);
            const isExistFolder = fs.existsSync(storedPath);
            if (! isExistFolder) {
                fs.mkdirSync(storedPath, {recursive: true});
            }
            const imgElement = await initInstance.driver.findElements(By.css(imageSelector));
            if (imgElement.length === 0) 
                return false;
            
            let urls = [];
            for (const index in imgElement) {
                let url = await imgElement[index].getAttribute("src");
                if (url.startsWith("/")) {
                    url = `${comicDomain}${url}`;
                }
                urls.push(url);
            }

            await this.downloadImageByUrl(initInstance.driver, initInstance.mainWindow, urls, storedPath, chapterWindowHandle);
        }

        await initInstance.driver.switchTo().window(initInstance.mainWindow);
        await initInstance.driver.close();
    },
    async downloadImageByUrl(driver, mainWindow, urls, storedPath, ignoredWindowHandle) {
        if (urls.length === 0) 
            return false;
        
        for (const index in urls) {
            await driver.executeScript(`window.open('${
                urls[index]
            }', '_blank');`);
        }

        let windowHandles = await driver.getAllWindowHandles();
        const excuteScript = await fsPromise.readFile(path.join(__dirname, "excuteScript.js"), {encoding: "utf-8"});

        const windowHandlesLength = windowHandles.length;

        for (const index in windowHandles) {
            if (windowHandles[index] === mainWindow || windowHandles[index] === ignoredWindowHandle) 
                continue;
            

            await driver.switchTo().window(windowHandles[index]);

            let base64 = await driver.executeScript(excuteScript);
            base64 = base64.replace(/^data:image\/\w+;base64,/, "");
            let buf = Buffer.from(base64, "base64");
            await fsPromise.writeFile(path.join(storedPath, `${
                windowHandlesLength - index
            }.jpeg`), buf);
        }

        windowHandles = await driver.getAllWindowHandles();
        for (const index in windowHandles) {
            if (windowHandles[index] === mainWindow) 
                continue;
            

            await driver.switchTo().window(windowHandles[index]);
            await driver.close();
        }

        await driver.switchTo().window(mainWindow);
    },
    async processDownloadImageByPattern(link, imageSelector, folderName) {
        const initInstance = await this.init(link);

        const storedPath = this.createFolder(folderName);

        const imgElements = await initInstance.driver.findElements(By.css(imageSelector));
        let urls = []
        const domain = new URL(link).origin;
        for (const index in imgElements) {
            let url = await imgElements[index].getAttribute("src");
            if (url.startsWith("/")) {
                url = `${domain}${url}`;
            }
            urls.push(url);
        }

        await this.downloadImageByUrl(initInstance.driver, initInstance.mainWindow, urls, storedPath, null);
        await initInstance.driver.switchTo().window(initInstance.mainWindow);
        await initInstance.driver.close();
    },
    async processDownloadImageByPatternWithMultiPage(link, imageSelector, folderName, pageParamName = 'page', pageStart = 1, pageEnd = 5) {
        const initInstance = await this.init(link);
        let urls = [];
        const domain = new URL(link).origin;
        for (let index = pageStart; index <= pageEnd; index++) {

            const pageLink = `${link}?${pageParamName}=${index}`;
            await initInstance.driver.executeScript(`window.open('${pageLink}', '_blank');`);
            const pageWindowHandle = (await initInstance.driver.getAllWindowHandles())[1];
            await initInstance.driver.switchTo().window(pageWindowHandle);

            const imgElements = await initInstance.driver.findElements(By.css(imageSelector));
            for (const index in imgElements) {
                let url = await imgElements[index].getAttribute("src");
                if (url.startsWith("/")) {
                    url = `${domain}${url}`;
                }
                urls.push(url);
            }
            await initInstance.driver.close();
            await initInstance.driver.switchTo().window(initInstance.mainWindow);
        }

        const storedPath = this.createFolder(folderName);
        await this.downloadImageByUrl(initInstance.driver, initInstance.mainWindow, urls, storedPath, null);

        await initInstance.driver.switchTo().window(initInstance.mainWindow);
        await initInstance.driver.close();
    }
};
