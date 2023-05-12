
const axios = require('axios');
require('dotenv').config();
const settings = require('./settings.js');

// get environment vars from .env file
const openai_api_key = process.env.OPENAI_API_KEY
const diffbot_token = process.env.DIFFBOT_TOKEN
const consume = {};
// save some webpage text to send with our prompts
const consumed_text = {};

consume.consume_webpage = function (message) {
    //the command will be in the format !openai consume <url> as <keyword>
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    if (args.length != 5) {
        message.channel.send("Sorry, I didn't understand that. Try !openai consume <url> as <keyword>");
        return;
    }
    const url = args[2];
    const keyword = args[4]

    if ((args[3] != "as") || (!url.startsWith("http"))) {
        message.channel.send("Sorry, I didn't understand that. Try !consume <url> as <keyword>");
        return;
    }

    message.channel.send("This will take a moment.  I'll let you know when I'm finished reading.");


    const urlParams = {
        token: diffbot_token,
        url: url
    }

    const headers = {
        accept: "application/json",
        'Accept-Encoding': 'gzip,deflate,compress'
    };

    // Fetch from the API and get the response
    axios.get('https://api.diffbot.com/v3/article',
        { params: urlParams },
        { headers: headers }
    ).then(response => {
        console.log(response.data);

        //initialize the consumed_text object if it doesn't exist
        if (consumed_text[message.channel] == undefined) {
            consumed_text[message.channel] = [];
        }

        if (response.data.objects[0].type == undefined) {
            message.channel.send("Sorry, I can't consume " + url + " as " + keyword + ".  Something went wrong.");
            return;
        }

        //if text available, get text from objects[0].text
        if (response.data.objects[0].text != undefined) {
            console.log("using text from diffbot response");
            var text = response.data.objects[0].text;
            const title = response.data.objects[0].title;
            if (text.length > 10000) {
                text = text.substring(0, 10000);
            }
            consumed_text[message.channel][keyword] = text;
        }


        else if (response.data.objects[0].html != undefined) {
            console.log("using html from diffbot response");
            const html = response.data.objects[0].html;
            const title = response.data.objects[0].title;
            var text = htmlToText.fromString(html);
            //if text is longer than 10000 characters, truncate it
            if (text.length > 10000) {
                text = text.substring(0, 10000);
            }
            consumed_text[message.channel][keyword] = text;
        }

        else {
            message.channel.send("Sorry, I can't consume " + url + ".  I wasn't able to retrieve any significant data.");
            return;
        }

        message.channel.send("I've consumed " + url + " as " + keyword);


    }).catch(error => {
        console.error(error);
    });

}


consume.consume_attachment = function (message) {
    //the command will be in the format !openai consume this as <keyword>
    console.log('Received command: ' + message.content);
    message.channel.sendTyping();
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    if (args.length != 5) {
        message.channel.send("Sorry, I didn't understand that. Try !openai consume this as <keyword> on a message containing a text attachment.");
        return;
    }
    const keyword = args[4];


    if (message.attachments.size == 0) {
        message.channel.send("You'll need to supply a text attachment with that command.");
        return;
    }

    if (consumed_text[message.channel] == undefined) {
        consumed_text[message.channel] = [];
    }

    //validate the attachment as text
    const attachment = message.attachments.first();
    console.log('attachment uploaded of type: ' + attachment.contentType)

    //if attachment.contentType does not include text, return an error

    if (!attachment.contentType.includes("text")) {
        message.channel.send("Sorry, I can only consume text files.");
        return;
    }


    //download the attachment and get the text
    const url = attachment.url;

    axios.get(url, { headers: { "Accept-Encoding": "gzip,deflate,compress" } }).then(response => {
        console.log(response.data);
        var text = response.data;
        //if text is longer than 9000 characters, truncate it
        if (text.length > 9000) {
            text = text.substring(0, 9000);
        }
        consumed_text[message.channel][keyword] = text;
        message.channel.send("I've consumed this as " + keyword);
    }).catch(error => {
        console.error(error);
        message.channel.send("Sorry, there was an unknown error.");
    });
}



//'WITH' COMMAND
consume.with = function (message) {
    message.channel.sendTyping();
    //the command will be in the format !openai with <keyword> <prompt>
    console.log('Received command: ' + message.content);
    // Split the message into an array of arguments
    const args = message.content.split(' ');
    if (args.length < 4) {
        message.channel.send("Sorry, I didn't understand that. Try '!openai with <keyword> <prompt>' after '!openai consume <url> as <keyword>'");
        return;
    }
    const keyword = args[2];
    const prompt = args.slice(3).join(' ');

    //initialize the consumed_text object if it doesn't exist
    if (consumed_text[message.channel] == undefined) {
        consumed_text[message.channel] = [];
    }

    if (!consumed_text[message.channel][keyword]) {
        message.channel.send("Sorry, I don't remember that. Try '!openai consume <url> as <keyword>'");
        return;
    }

    var complete_prompt = keyword + ":" + consumed_text[message.channel][keyword] + "\n"
        + message.author.username + ":" + prompt + "\n"
        + "OpenAI:";

    console.log(complete_prompt);

    const bodyParameters = {
        prompt: complete_prompt,
        model: settings.get('text_completion_model'),
        max_tokens: 200,
        n: 1,
        temperature: settings.get('temperature')   //Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.
    };

    const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + openai_api_key,
        'Accept-Encoding': 'gzip,deflate,compress'
    };

    // Send the text to the OpenAI API and get the response
    axios.post('https://api.openai.com/v1/completions',
        bodyParameters,
        { headers: headers }
    ).then(response => {
        // Send the response back to the Discord channel
        message.channel.send(response.data.choices[0].text);

    }).catch(error => {
        console.error(error);
        handle_openai_error(error, message);
    });

}  

module.exports = consume;