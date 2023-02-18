const axios = require('axios');
require('dotenv').config();
const settings = require('./settings.js');
const bot_memories = require('./remember.js');

const openai_api_key = process.env.OPENAI_API_KEY

const openai_text = {};
var conversations = {};

// create an empty function in the module
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

    var temperature = settings.get('text_completion_temperature');
    if (message.content.includes("bereal") || message.content.includes("be real") || message.content.includes("be honest") || message.content.includes("no really") || message.content.includes("for real")) {
        temperature = 0;
        console.log("Setting temperature to 0, because we found an honesty prompt.");
    }

    const text = args.slice(1).join(' ');
    var prompt = text;
    if (settings.get('conversation')) {
        if (conversations[message.channel] == undefined) {
            conversations[message.channel] = "";
        }
        prompt = conversations[message.channel] + "\n" + message.author.username + ": " + text;
        prompt = prompt + "\n" + "OpenAI: ";
    }
    //if there is a bot memory
    const memory = bot_memories.get(message.channel);
    if (memory) {
        prompt = memory + "\n" + prompt;
    }

    console.log(prompt);

    const bodyParameters = {
        prompt: prompt,
        model: settings.get('text_completion_model'),
        max_tokens: 486,
        n: 1,
        temperature: temperature  //Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.
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
        if (settings.get('conversation')) {
            conversations[message.channel] = conversations[message.channel] + "\n" + message.author.username + ": " + text + "\n" + "OpenAI: " + response.data.choices[0].text;
        }

    }).catch(error => {
        console.error(error);
        handle_openai_error(error, message);
    });
}

openai_text.resetConversation = function (message) {
    conversations[message.channel] = "";
}



const handle_openai_error = (error, message) => {
    if (error.response && error.response.data) {
        if (error.response.data.error && error.response.data.error.message) {

            if (error.response.data.error.message.startsWith("This model's maximum context length")) {
                // Tokens are a bit tricky to manage, so if we run out of tokens, just reset the conversation
                message.channel.send("Hi! That other bot was tired, so I'm taking over. What do you want to talk about?");
                conversations[message.channel] = "";
            }

            if (error.response.data.error.message.startsWith("You have reached your")) {
                message.channel.send("Sorry, I'm out of tokens for the day. Try again later!");
            }

            if (error.response.data.error.message.startsWith("That model is currently overloaded")) {
                message.channel.send("Sorry, I'm a bit bogged down right now. Try again in a few minutes!");
            }

            if (error.response.data.error.message.startsWith("You exceeded your current quota")) {
                message.channel.send("Sorry, I'm out of credits. Try again later!");
            }
        }
        console.log(error.response.data);
    }
}

module.exports = openai_text;