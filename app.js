const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages] }); 



client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('messageCreate', message => {
    console.log('Received message: ' + message.content);
  // Check if the message is a command
  if (message.content.startsWith('!openai')) {
    //message.channel.startTyping();
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    // Get the command and any additional arguments
    const command = args[0];
    const text = args.slice(1).join(' ');

    const bodyParameters = {
      prompt: text,
      model: 'text-davinci-003',
      max_tokens: 24,
      temperature: 0.9   //Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.
    };

    const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY
    };

    // Send the text to the OpenAI API and get the response
    axios.post('https://api.openai.com/v1/completions',
        bodyParameters,
        { headers: headers }
    ).then(response => {
      // Send the response back to the Discord channel
      message.channel.send(response.data.choices[0].text);
      //message.channel.stopTyping();
    }).catch(error => {
      console.error(error);
      //message.channel.stopTyping();
    });
  }
});


client.login(process.env.DISCORD_BOT_TOKEN);
