const axios = require('axios');
require('dotenv').config();
const settings = require('./settings.js');
const bot_memories = require('./remember.js');
const handle_openai_error = require('./openai_error.js');

const openai_api_key = process.env.OPENAI_API_KEY

const openai_text = {};
var conversations = {};

openai_text.sendPrompt = function (message) {
    message.channel.sendTyping();
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    // Get the command and any additional arguments

    if (args.length < 2) {
        message.channel.send("Please provide a prompt.");
        return;
    }

    // determine temperature
    var temperature = settings.get([message.channel + "_temperature"], 0.8);
    if (message.content.includes("bereal") || message.content.includes("be real") || message.content.includes("be honest") || message.content.includes("no really") || message.content.includes("for real")) {
        temperature = 0;
        console.log("Setting temperature to 0, because we found an honesty prompt.");
    }

    const text = args.slice(1).join(' ');
    var prompt = text;

    if (conversations[message.channel] == undefined) {
        conversations[message.channel] = [];
    }
    // prompt = conversations[message.channel] + "\n" + message.author.username + ": " + text;
    // prompt = prompt + "\n" + "OpenAI: ";
    //add the user's message to the conversation as a new object
    conversations[message.channel].push({ "role": "user", "content": message.author.username + ": " + text });

    var gpt_messages = [];
    //if there is a bot memory
    const memory = bot_memories.get(message.channel);
    if (memory) {
        gpt_messages.push({ "role": "system", "content": memory });
    }
    //add the conversation objects to the gpt_messages array
    gpt_messages = gpt_messages.concat(conversations[message.channel]);

    const bodyParameters = {
        //prompt: prompt,
        model: 'gpt-3.5-turbo',
        max_tokens: 486,
        n: 1,
        temperature: temperature,  //Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.
        messages: gpt_messages,
    };

    console.log(JSON.stringify(bodyParameters, null, 2));

    const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + openai_api_key,
        'Accept-Encoding': 'gzip,deflate,compress'
    };

    // Send the text to the OpenAI API and get the response
    axios.post('https://api.openai.com/v1/chat/completions',
        bodyParameters,
        { headers: headers }
    ).then(response => {
        // Send the response back to the Discord channel
        message.channel.send(response.data.choices[0].message.content);
        //add the bot's response to the conversation as a new object
        conversations[message.channel].push({ "role": "assistant", "content": response.data.choices[0].message.content });
        console.log("OpenAI: " + response.data.choices[0].message.content);

    }).catch(error => {
        console.error(error);
        handle_openai_error(error, message, conversations);
    });
}

openai_text.resetConversation = function (message) {
    conversations[message.channel] = [];
}

openai_text.set_temp = function (message){
    const args = message.content.split(' ');
    if (args.length < 2) {
        message.channel.send("Please provide a temperature.");
        return;
    }
    var temperature = args[2];
    if (isNaN(temperature)) {
        message.channel.send("Please provide a number.");
        return;
    }
    if (temperature < 0 || temperature > 1) {
        message.channel.send("Please provide a number between 0 and 1.");
        return;
    }
    console.log("Setting temperature to " + temperature + " for this channel: " + message.channel);
    settings.update(message.channel + "_temperature", parseFloat(temperature));
    message.channel.send("Temperature set to " + temperature + " for this channel.");

}

module.exports = openai_text;