const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const Canvas = require('@napi-rs/canvas');
const fs = require('fs');
require('dotenv').config();

// get environment vars from .env file
const discord_token = process.env.DISCORD_BOT_TOKEN
const openai_api_key = process.env.OPENAI_API_KEY

// keep a running dialog with the bot
const running_conversation = true;
var conversations = {};

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
  //OPENAI COMMAND
  if (message.content.startsWith('!openai')) {
    message.channel.sendTyping();
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    // Get the command and any additional arguments
    const command = args[0];
    const text = args.slice(1).join(' ');
    var prompt = text;
    if (running_conversation) {
      if (conversations[message.channel] == undefined) {
        conversations[message.channel] = "";
      }
      prompt = conversations[message.channel] + "\n" + message.author.username + ": " + text;
      prompt = prompt + "\n" + "OpenAI: ";
    }

    console.log(prompt);

    const bodyParameters = {
      prompt: prompt,
      model: 'text-davinci-003',
      max_tokens: 486,
      n: 1,
      temperature: 0.9   //Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openai_api_key
    };

    // Send the text to the OpenAI API and get the response
    axios.post('https://api.openai.com/v1/completions',
      bodyParameters,
      { headers: headers }
    ).then(response => {
      // Send the response back to the Discord channel
      message.channel.send(response.data.choices[0].text);
      if (running_conversation) {
        conversations[message.channel] = conversations[message.channel] + "\n" + message.author.username + ": " + text + "\n" + "OpenAI: " + response.data.choices[0].text;
      }

    }).catch(error => {
      console.error(error);

      if (error.response && error.response.data) {
        if ( error.response.data.error && error.response.data.error.message) {
          if (running_conversation && error.response.data.error.message.startsWith("This model's maximum context length")) {
            // Tokens are a bit tricky to manage, so if we run out of tokens, just reset the conversation
            message.channel.send("Sorry, could you please repeat that?");
            conversations[message.channel] = "";
          }
        }
        console.log(error.response.data);
      }
      
    });
  } //End of OPENAI COMMAND


  //DALLE COMMAND
  if (message.content.startsWith('!dalle')) {
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

  //if message has attachment
  if (message.attachments.size > 0) {

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
