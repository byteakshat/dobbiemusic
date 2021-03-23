const Insta = require('@androz2091/insta.js');
const ytdl = require('ytdl-core');
const YouTube = require("youtube-sr").default;

const client = new Insta.Client()
const config = require('./config.json');

client.on('connected', () => {
    console.log(`Client connected with the profile ${client.user.username}`);
})


client.on('pendingRequest', chat => {
        chat.approve();
    });

client.on('messageCreate', async message => {  

    if(!message.content || message.authorID === client.user.id || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    message.markSeen();
     

    if(['play', 'p'].includes(commandName)) {

        if(!args.length) return message.chat.sendMessage('Please specify a search.');

        message.chat.startTyping({ disableOnSend: true });

        const result = await YouTube.search(args.join(' '), { limit: 500 }).catch(() => null);
        if (!result) return message.chat.sendMessage(`Error: No music found for search: "${args.join(' ')}".`);

        const videosFiltered = result.filter(v => v.duration < 60000);
        if(!videosFiltered.length) return message.chat.sendMessage(`Error: No music less than 1 minute old found among search results.`);

        await message.chat.sendMessage(`Send a number between 1 and ${videosFiltered.length} to choose the video.`);
        await message.chat.sendMessage(videosFiltered.map((v, i) => `${i + 1}. ${v.title}`).slice(0, 10).join('\n'))

        const collector = message.createMessageCollector({ idle: 20000 });

        collector.on('message', msg => {
            if(msg.authorID === client.user.id) return;
            
            collector.end();
            msg.markSeen();

            if (!msg.content) return message.chat.sendMessage('Cancelled order.');
            
            const int = parseInt(msg.content, 10);
            if(!int || int <=0 || int > videosFiltered.length) return message.chat.sendMessage('Cancelled order.');

            message.chat.startTyping({ disableOnSend: true });

            try {
                const stream = ytdl(videosFiltered[int - 1].url, { filter: format => format.container === 'mp4' });
                const array = [];
                stream
                .on('data', chunk => {
                    array.push(chunk);
                })
                .on('end', () => {
                    message.chat.sendVoice(Buffer.concat(array));
                });
            }
            catch (err) {
                message.chat.sendMessage('Error, unable to send voice');
            }
        })
    }

    if(['help', 'h'].includes(commandName)) return message.chat.sendMessage('Here is the list of available commands: \n• help \n• play <music>')

})

client.login(config.username, config.password);
