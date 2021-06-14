const express = require("express");
const launchChrome = require("./../launchChrome");
const rootPath = require('./../getRootPath');
const archiver = require('archiver');
const faker = require('faker');
const fs = require('fs');
const fsPromise = require('fs/promises');
const app = express();
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const port = 3000;
const downloadOptions = (randomFolderName) => {
    return {
        headers: {
            'Content-Disposition': `attachment; filename="${randomFolderName}.zip"`
        }
    }
};

app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/images", express.static(path.join(rootPath, "images")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use(express.urlencoded());
app.use(express.json());

app.post("/download-all-chapter-comic", async (req, res) => {
    const comicLink = req.body.comicLink;
    const imageSelector = req.body.imageSelector;
    const listChapterSelector = req.body.listChapterSelector;
    const comicName = req.body.comicName;

    await launchChrome.processDownloadAllChapterComic(comicLink, comicName, imageSelector, listChapterSelector);
    const downloadZipFile = path.join(rootPath, 'images', `${comicName}.zip`);
    const archive = archiver('zip');
    const output = fs.createWriteStream(downloadZipFile)

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.sendFile(downloadZipFile, downloadOptions(comicName))
    });

    archive.on('error', function (err) {
        console.log(err)
        throw err;
    });

    archive.pipe(output);
    archive.directory(path.join(rootPath, 'images', comicName), false);
    archive.finalize();
});

app.post("/download-multi-chapter-comic", async (req, res) => {
    const comicLink = req.body.comicLink;
    const imageSelector = req.body.imageSelector;
    const listChapterSelector = req.body.listChapterSelector;
    const start = req.body.start;
    const end = req.body.end;
    const comicName = `${
        req.body.comicName
    }-from-${start}-to-${end}`;


    await launchChrome.processDownloadMultiChapterComic(comicLink, comicName, imageSelector, listChapterSelector, start, end);
    const downloadZipFile = path.join(rootPath, 'images', `${comicName}.zip`);
    const archive = archiver('zip');
    const output = fs.createWriteStream(downloadZipFile)

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.sendFile(downloadZipFile, downloadOptions(comicName))
    });

    archive.on('error', function (err) {
        console.log(err)
        throw err;
    });

    archive.pipe(output);
    archive.directory(path.join(rootPath, 'images', comicName), false);
    archive.finalize();
});

app.post('/download-images', async (req, res) => {
    const link = req.body.link;
    const imageSelector = req.body.imageSelector;
    const randomFolderName = faker.datatype.uuid();
    await launchChrome.processDownloadImageByPattern(link, imageSelector, randomFolderName);

    const downloadZipFile = path.join(rootPath, 'images', `${randomFolderName}.zip`);
    const archive = archiver('zip');
    const output = fs.createWriteStream(downloadZipFile)

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.sendFile(downloadZipFile, downloadOptions(randomFolderName))
    });

    archive.on('error', function (err) {
        console.log(err)
        throw err;
    });

    archive.pipe(output);
    archive.directory(path.join(rootPath, 'images', randomFolderName), false);
    archive.finalize();
})

app.post('/download-images-multipage', async (req, res) => {
    const link = req.body.link;
    const imageSelector = req.body.imageSelector;
    const randomFolderName = faker.datatype.uuid();
    const pageParamName = req.body.pageParamName;
    const pageStart = req.body.pageStart;
    const pageEnd = req.body.pageEnd;
    await launchChrome.processDownloadImageByPatternWithMultiPage(link, imageSelector, randomFolderName, pageParamName, pageStart, pageEnd);

    const downloadZipFile = path.join(rootPath, 'images', `${randomFolderName}.zip`);
    const archive = archiver('zip');
    const output = fs.createWriteStream(downloadZipFile)

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.sendFile(downloadZipFile, downloadOptions(randomFolderName))
    });

    archive.on('error', function (err) {
        console.log(err)
        throw err;
    });

    archive.pipe(output);
    archive.directory(path.join(rootPath, 'images', randomFolderName), false);
    archive.finalize();
})


app.get('/files-folders', async (req, res) => {
    try {
        const files = await fsPromise.readdir(path.join(rootPath, "images"));
        return res.json(files);
    } catch (err) {
        console.error(err);
    }
})

app.delete('/files-folders', async (req, res) => {
    try {
        const files = req.body;
        const removeOptions = {
            recursive: true
        }
        for (const index in files) {
            if (fs.existsSync(files[index])) {
                await fsPromise.rm(files[index], removeOptions)
            }
        }

        return res.json({message: 'Deleted'})
    } catch (error) {
        console.error(err);
    }
})

app.listen(process.env.PORT || port, () => console.log(`Application listen on port: ${port}`));
