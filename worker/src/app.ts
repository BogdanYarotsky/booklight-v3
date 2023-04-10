import amqp, { Connection } from 'amqplib';
import { CHROME_ARGS, DEBUG_CHROME_PATH, NODE_EXIT_EVENTS } from './config';
import Goodreads from './goodreads';
import puppeteer from 'puppeteer-extra';
import { Browser } from 'puppeteer-core';
import StealthPlugin from "puppeteer-extra-plugin-stealth";

async function startBrowser(): Promise<Browser> {
    return await puppeteer
        .use(StealthPlugin())
        .launch({
            executablePath: process.env.CHROME_BIN ?? DEBUG_CHROME_PATH,
            args: CHROME_ARGS
        });
}

async function main() {
    const browser = await startBrowser();
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

