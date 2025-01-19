import { NextApiRequest, NextApiResponse } from "next";
import DbPool from "../../database/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const dbPool = new DbPool();
    const resultPromise = await dbPool.getPool().query("" +
        "SELECT c.number, c2.id, c2.title, c2.card_image FROM collectibles AS c " +
        "LEFT JOIN collectibles AS c2 " +
        "ON c.id = c2.id AND c2.title = ANY ($1) " +
        "ORDER by c.number ASC", [req.body.nfts]);

    let objs = [];
    for(let i = 0; i < resultPromise.rows.length; i++) {
        objs.push({
           'number': resultPromise.rows[i].number,
           'id': resultPromise.rows[i].id,
           'title': resultPromise.rows[i].title,
           'shortDescription': '',
           'card': resultPromise.rows[i].card_image,
        });
    }

    res.status(200).json({ catalog: objs });
}