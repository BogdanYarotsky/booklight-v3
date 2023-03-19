import amqp from 'amqplib';
import Book from 'booklight-shared';

// Dummy data for demonstration purposes
async function main() {
    const rabbitmqHost = process.env.RABBITMQ_HOST ?? 'localhost';
    const connection = await amqp.connect(`amqp://${rabbitmqHost}`);
    const channel = await connection.createChannel();
    await channel.assertQueue('books_queries');
    await channel.assertQueue('books_results');
    channel.prefetch(1); // Process one message at a time

    console.log('Worker is waiting for tasks');
    channel.consume('books_queries', async (msg) => {
        if (!msg) return;
        const query = msg.content.toString();
        console.log(`Received query: ${query}`);

        const book: Book = {
            title: query,
            url: '',
            imageUrl: '',
            rating: 0,
            reviews: 0,
            authors: [],
            score: 0
        };

        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify([book])), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);

        console.log("Sent response: ");
        console.log(book);
    });
}

main().catch(console.log);
