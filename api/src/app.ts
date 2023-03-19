import Book from 'booklight-shared';
import express, { Response } from 'express';
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

async function main() {
    const connection = await amqp.connect('amqp://localhost:5672');
    const channel = await connection.createChannel();
    await channel.assertQueue('books_queries');
    const resultsQueue = await channel.assertQueue('books_results');
    const responseEmitter = new EventEmitter();
    channel.consume(resultsQueue.queue, (msg) => {
        if (msg) {
            responseEmitter.emit(msg.properties.correlationId, msg);
        }
    }, { noAck: false });

    const app = express();

    app.get('/api/search', async (req, res: Response<Book[]>) => {
        const query = req.query.q as string;
        const correlationId = uuidv4();

        channel.sendToQueue('books_queries', Buffer.from(query), {
            correlationId: correlationId,
            replyTo: resultsQueue.queue,
        });
        console.log(`Sent request: ${query}`);

        responseEmitter.once(correlationId, (msg) => {
            const booksResults = JSON.parse(msg.content.toString()) as Book[];
            res.send(booksResults);
            channel.ack(msg);
            console.log(`Received response: ${msg.content.toString()}`);
        });
    });

    app.listen(process.env.PORT ?? 8080,
        () => console.log('server has started'));
};

main().catch(console.log);





