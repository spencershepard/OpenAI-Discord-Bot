const axios = require('axios');
require('dotenv').config();
const settings = require('./settings.js');
const handle_openai_error = require('./openai_error.js');

const openai_api_key = process.env.OPENAI_API_KEY

const imitate = {};

imitate.imitate_user = function (message) {
    message.channel.sendTyping();
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    // Get the command and any additional arguments

    //the message will be structured like this: !openai imitate @user prompt

    //get the user
    const user = message.mentions.users.first();
    if (!user) {
        message.channel.send("Please provide a user mention.");
        return;
    }

    const input_prompt = args.slice(3).join(' ');
    console.log('the input prompt:' + input_prompt);



    //get the user's messages asynchonously
    message.channel.messages.fetch({ limit: settings.get('imitate_messages_history') })
        .then(messages => {
            const user_messages = messages.filter(m => m.author.id === user.id);

            var prompt = "";
            user_messages.forEach(m => {
                //if the message is a command, don't include it in the prompt
                if (!m.content.startsWith('!openai')) {
                    prompt = prompt + m.author.username + ": " + m.content + "\n";
                }
            });

            //add the input prompt
            prompt = prompt + message.author.username + ': ' + input_prompt + "\n";

            //prompt the bot to respond as the user
            prompt = prompt + user.username + ': ';

            console.log(prompt);

            var temperature = 0.8;

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
                // if (settings.get('conversation')) {
                //     conversations[message.channel] = conversations[message.channel] + "\n" + message.author.username + ": " + text + "\n" + "OpenAI: " + response.data.choices[0].text;
                // }

            }).catch(error => {
                console.error(error);
                handle_openai_error(error, message);
            });

        })
        .catch(console.error);
}

module.exports = imitate;