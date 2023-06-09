import Book from 'booklight-shared';
import express, { Response } from 'express';
import amqp, { Connection } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import cors from 'cors';

async function main() {
    //rabbitmq
    const rabbitmqHost = process.env.RABBITMQ_HOST ?? 'localhost';
    const retryInterval = 5000;
    let connection: Connection | undefined;

    while (!connection) {
        try {
            connection = await amqp.connect(`amqp://${rabbitmqHost}`);
            console.log('Connected to RabbitMQ');
        } catch (err) {
            console.error('Failed to connect to RabbitMQ, retrying in', retryInterval / 1000, 'seconds:', err);
            await new Promise(r => setTimeout(r, retryInterval));
        }
    }
    const channel = await connection.createChannel();
    await channel.assertQueue('books_queries');
    const resultsQueue = await channel.assertQueue('books_results');
    const responseEmitter = new EventEmitter();
    channel.consume(resultsQueue.queue, (msg) => {
        if (msg) {
            responseEmitter.emit(msg.properties.correlationId, msg);
        }
    }, { noAck: false });
    //express
    const app = express();
    const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:4200';
    app.use(
        cors({
            origin: allowedOrigin,
        })
    );
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



