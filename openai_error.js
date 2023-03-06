const handle_openai_error = (error, message, conversations) => {
    if (error.response && error.response.data) {
        if (error.response.data.error && error.response.data.error.message) {

            if (error.response.data.error.message.startsWith("This model's maximum context length")) {
                // Tokens are a bit tricky to manage, so if we run out of tokens, just reset the conversation
                message.channel.send("Hi! That other bot was tired, so I'm taking over. What do you want to talk about?");
                conversations[message.channel] = [];
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

module.exports = handle_openai_error;