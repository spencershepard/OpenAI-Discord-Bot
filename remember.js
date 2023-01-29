// Load a yaml file that stores text strings, or create if it doesn't exist
var yaml = require('js-yaml');
var fs = require('fs');

//create an empty object to store the memories
var bot_memories = {};

bot_memories.memories = {};

try {

    bot_memories.memories = yaml.load(fs.readFileSync('bot-memories.yaml', 'utf8'));

} catch (e) {
    console.log(e);
    //write the file
    fs.writeFileSync('bot-memories.yaml', yaml.dump(bot_memories.memories));
}

//function for adding a memory, takes a key and a value
bot_memories.add = function(key, value) {
    bot_memories.memories[key] = value;
    fs.writeFileSync('bot-memories.yaml', yaml.dump(bot_memories.memories));
}

//function for getting a memory, takes a key
bot_memories.get = function(key) {
    const memory = bot_memories.memories[key];
    if (memory) {
        //const prompt = "UNBREAKABLE RULES for OpenAI: " + memory;
        const prompt = "" + memory;
        return prompt;
    }
}

//function for deleting a memory, takes a key
bot_memories.delete = function(key) {
    delete bot_memories.memories[key];
    fs.writeFileSync('bot-memories.yaml', yaml.dump(bot_memories.memories));
}

//export the module
module.exports = bot_memories;