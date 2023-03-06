const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const Canvas = require('@napi-rs/canvas');
const fs = require('fs');
const { channel } = require('diagnostics_channel');
require('dotenv').config();

// get environment vars from .env file
const discord_token = process.env.DISCORD_BOT_TOKEN
const openai_api_key = process.env.OPENAI_API_KEY
const diffbot_token = process.env.DIFFBOT_TOKEN

//import settings.js
const settings = require('./settings.js');
const bot_memories = require('./remember.js');
const openai_text = require('./openai_text.js');
const consume = require('./consume.js');
const imitate = require('./imitate.js');



// create new discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages]
});


// discord login success
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// when a discord message is received
client.on('messageCreate', message => {

  var command = null
  if (message.content.startsWith('!openai consume this')) {
    consume.consume_attachment(message);
  }
  else if (message.content.startsWith('!openai consume')) {
    consume.consume_webpage(message);
  }
  else if (message.content.startsWith('!openai remember')) {
    command = "remember";
  }
  else if(message.content.startsWith('!openai with')) {
    consume.with(message);
  }
  else if (message.content.startsWith('!openai reset')) {
    command = "reset";
  }
  else if (message.content.startsWith('!openai imitate')) {
    //imitate.imitate_user(message);
    //send response to channel
    message.channel.send("This command is currently disabled. Please try again later.");
  }
  else if (message.content.startsWith('!openai temperature')) {
    openai_text.set_temp(message);
  }
  else if (message.content.startsWith('!openai')) {
    openai_text.sendPrompt(message);
  } 
  else if (message.content.startsWith('!dalle')) {
    command = "dalle";
  }




  //OPENAI COMMAND
  if (command == "openai_prompt") {
    openai_text.sendPrompt(message);
  } //End of OPENAI COMMAND


  //DALLE COMMAND
  if (command == "dalle") {
    message.channel.sendTyping();
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    // Get the command and any additional arguments
    const command = args[0];
    const text = args.slice(1).join(' ');

    const bodyParameters = {
      prompt: text,
      n: 1,
      size: "1024x1024"
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openai_api_key
    };

    // Send the text to the OpenAI API and get the response
    axios.post('https://api.openai.com/v1/images/generations',
      bodyParameters,
      { headers: headers }
    ).then(response => {
      const image_url = response.data.data[0].url;
      // Send the response back to the Discord channel
      //console.log(response.data);
      console.log(image_url);
      const myEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(text + " for " + message.author.username)
        .setURL(image_url)
        .setImage(image_url)

      message.channel.send({ embeds: [myEmbed] });

    }).catch(error => {
      console.error(error);
    });
  }  //end of DALLE COMMAND

 

  //'REMEMBER' COMMAND
  if (command == "remember") {
    //the command will be in the format !openai remember <prompt>
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    if (args.length < 3) {
      message.channel.send("Sorry, I didn't understand that. Try '!openai remember <prompt>'");
      return;
    }

    const prompt = args.slice(2).join(' ');
    bot_memories.add(message.channel, prompt);
    message.channel.send("I'll remember that. In fact...that's all I remember.");
    openai_text.resetConversation(message);

  }

  //'RESET' COMMAND
  if (command == "reset") {
    //clear the conversation history for this channel
    openai_text.resetConversation(message);
    message.channel.send("Conversation history cleared.");
  }


  //if message has attachment
  if (message.attachments.size > 0) {
    //todo: implement a better condition to send an image to dalle
    return;

    //if image extension is not png or jpeg
    if (message.attachments.first().contentType != "image/png" && message.attachments.first().contentType != "image/jpeg") {
      return;
    }

    //get image data from url
    const attachment_data = axios.get(message.attachments.first().url, { responseType: 'arraybuffer' })
      .then(response => {

        //Sending images to openai api must be square and png format only, so we will use canvas to crop/resize, and convert to png

        //find the largest image dimension
        const largest_dimension = Math.max(message.attachments.first().width, message.attachments.first().height);
        const smallest_dimension = Math.min(message.attachments.first().width, message.attachments.first().height);


        //create new canvas from image
        const canvas = Canvas.createCanvas(1200, 1200);
        const ctx = canvas.getContext('2d');
        const image = new Canvas.Image();
        image.src = response.data;


        // ctx.drawImage(image, 0, 0, message.attachments.first().width, message.attachments.first().height);
        ctx.drawImage(image,
          message.attachments.first().width / 2 - smallest_dimension / 2, message.attachments.first().height / 2 - smallest_dimension / 2,  // source x, y start
          smallest_dimension, smallest_dimension, // source width, height
          0, 0, // destination x, y start
          1200, 1200 // destination width, height
        );

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('image.png', buffer);


        message.channel.sendTyping();
        getDalleVariation(fs.createReadStream('image.png'), message);

      }).catch(error => {
        console.error(error);
      });


  }


});


const getDalleVariation = async (image_data, message) => {
  const bodyParameters = {
    image: image_data,
    n: 1,
    size: "1024x1024"
  };

  const headers = {
    'Content-Type': 'multipart/form-data',
    Authorization: 'Bearer ' + openai_api_key
  };

  // Send the text to the OpenAI API and get the response
  axios.post('https://api.openai.com/v1/images/variations',
    bodyParameters,
    { headers: headers }
  ).then(response => {

    //create an embed and send it to the channel
    const image_url = response.data.data[0].url;
    const myEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setURL(image_url)
      .setImage(image_url)

    message.channel.send({ embeds: [myEmbed] });

  }).catch(error => {
    console.error(error);
  });
}




//Do not commit with your token in the code...use .env file
client.login(discord_token);
