import DbPool from "../../database/db";
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
    const dbPool = new DbPool();
    const resultPromise = await dbPool.getPool().query("" +
        "SELECT COUNT(*) as cnt FROM collectibles AS c " +
        "WHERE id = $1", [req.body.uuid]);

    if (resultPromise.rows[0].cnt === undefined) {
        res.status(404).json(null);
    }

    try {
        const folderPath = path.join(process.cwd(), 'media', 'book_1', req.body.uuid, 'photos');
        const videosFolderPath = path.join(process.cwd(), 'media', 'book_1', req.body.uuid, 'videos');

        const files = await fs.readdir(folderPath);
        const videoFiles = await fs.readdir(videosFolderPath);

        const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        const videoFilesFiltered = videoFiles.filter(file => /\.(mp4)$/i.test(file));

        if (imageFiles.length === 0) {
            res.status(200).json(null);
        }
        const imagesBase64 = await Promise.all(
            imageFiles.map(async file => {
                const filePath = path.join(folderPath, file);
                const fileData = await fs.readFile(filePath);
                return {
                    fileName: file,
                    base64: fileData.toString('base64'),
                };
            })
        );

        const cardFilePath = path.join(process.cwd(), 'media', 'book_1', req.body.uuid, 'card.png');
        const fileData = await fs.readFile(cardFilePath);
        const cardFileBase64 = fileData.toString('base64');

        const videoFileExist = videoFilesFiltered.length > 0 ? req.body.uuid : false;

        //await new Promise(resolve => setTimeout(resolve, 5000));
        res.status(200).json({ card: cardFileBase64, images: imagesBase64, video: videoFileExist });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process images' });
    }
}
