import amqp, { Connection } from 'amqplib';
import { CHROME_ARGS, DEBUG_CHROME_PATH, NODE_EXIT_EVENTS } from './config';
import Goodreads from './goodreads';

import startStealth from 'puppeteer-stealthy';

async function main() {
    const chromePath = process.env.CHROME_BIN ?? DEBUG_CHROME_PATH;
    const browser = await startStealth(chromePath);
    const goodreads = new Goodreads(browser);

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
    await channel.assertQueue('books_results');
    channel.prefetch(1); // Process one message at a time

    console.log('Worker is waiting for tasks');
    channel.consume('books_queries', async (msg) => {
        if (!msg) return;
        const query = msg.content.toString();
        console.log(`Received query: ${query}`);
        const books = await goodreads.getBooks(query);
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(books)), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
        console.log("Total books sent: " + books.length);
    });

    NODE_EXIT_EVENTS.forEach(event => {
        process.on(event, () => {
            browser?.close();
            channel?.close();
            connection?.close();
            process.exit();
        });
    })
}

main().catch(console.log);

