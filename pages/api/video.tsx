import { NextApiRequest, NextApiResponse } from "next";
import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const videosFolderPath = path.join(process.cwd(), 'media', 'book_1', req.query.id as string, 'videos');
        const videoFiles = await fs.readdir(videosFolderPath);
        const videoFilesFiltered = videoFiles.filter(file => /\.(mp4)$/i.test(file));

        let videoFilePath = await Promise.all(
        videoFilesFiltered.map(async (file: string) => {
            const filePath = path.join(videosFolderPath, file);

            if (!fsExists(filePath)) {
                return res.status(404).json({error: 'Video not found'});
            }

            return filePath;
        }));

        const firstVideoFile = videoFilePath[0];

        // @ts-ignore
        if (!(await fsExists(firstVideoFile))) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // @ts-ignore
        const stat = await fs.stat(firstVideoFile);

        // Устанавливаем заголовки для стриминга
        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
        });

        // @ts-ignore
        const videoStream = await fs.readFile(firstVideoFile);
        res.end(videoStream);
    } catch (error) {
        console.error('Error reading video file:', error);
        res.status(500).json({error: 'Failed to load video'});
    }
}
