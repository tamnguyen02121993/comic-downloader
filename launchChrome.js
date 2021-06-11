const { Builder, By, Capabilities } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fsPromise = require("fs/promises");
const fs = require("fs");
const path = require("path");

module.exports = {
  driver: null,
  mainWindow: null,
  async process(comicLink, comicName, selectorImage, selectorListChapter) {
    this.driver = new Builder()
      .forBrowser("chrome")
      .setChromeOptions(new chrome.Options().headless())
      .build();
    await this.driver.get(comicLink);
    this.mainWindow = await this.driver.getWindowHandle();

    let selectElement = await this.driver.findElement(
      By.css(selectorListChapter)
    );

    let listChapter = await selectElement.findElements(By.css("option"));

    if (listChapter.length === 0) return false;

    const comicDomain = new URL(comicLink).origin;

    for (const i in listChapter) {
      let chapterLink = await listChapter[i].getAttribute("value");
      if (chapterLink.startsWith("/")) {
        chapterLink = `${comicDomain}${chapterLink}`;
      }
      const chapter = await listChapter[i].getText();
      await this.driver.executeScript(
        `window.open('${chapterLink}', '_blank');`
      );

      const chapterWindowHandle = (await this.driver.getAllWindowHandles())[1];
      await this.driver.switchTo().window(chapterWindowHandle);

      const storedPath = path.join(__dirname, "images", comicName, chapter);
      const isExistFolder = fs.existsSync(storedPath);
      if (!isExistFolder) {
        fs.mkdirSync(storedPath, {
          recursive: true,
        });
      }
      const imgs = await this.driver.findElements(By.css(selectorImage));
      if (imgs.length === 0) return false;

      for (const index in imgs) {
        await this.driver.executeScript(
          `window.open('${await imgs[index].getAttribute("src")}', '_blank');`
        );
      }
      let windowHandles = await this.driver.getAllWindowHandles();
      const excuteScript = await fsPromise.readFile(
        path.join(__dirname, "excuteScript.js"),
        {
          encoding: "utf-8",
        }
      );

      const windowHandlesLength = windowHandles.length;

      for (const index in windowHandles) {
        if (
          windowHandles[index] === this.mainWindow ||
          windowHandles[index] === chapterWindowHandle
        )
          continue;
        await this.driver.switchTo().window(windowHandles[index]);

        let base64 = await this.driver.executeScript(excuteScript);
        base64 = base64.replace(/^data:image\/\w+;base64,/, "");
        let buf = Buffer.from(base64, "base64");
        await fsPromise.writeFile(
          path.join(storedPath, `${windowHandlesLength - index}.jpeg`),
          buf
        );
      }
      windowHandles = await this.driver.getAllWindowHandles();
      for (const index in windowHandles) {
        if (windowHandles[index] === this.mainWindow) continue;
        await this.driver.switchTo().window(windowHandles[index]);
        await this.driver.close();
      }

      await this.driver.switchTo().window(this.mainWindow);
    }

    await this.driver.switchTo().window(this.mainWindow);
    await this.driver.close();
    return true;
  },
};
