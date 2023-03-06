// Load a yaml settings file, or create if it doesn't exist
var yaml = require('js-yaml');
var fs = require('fs');

var default_settings = {
    "text_completion_model": "text-davinci-003",
    "conversation": true,
    "imitate_messages_history": 100, //discord only allows 100 messages to be fetched
    "temperature": 0.8,
  }

var settings = {}
var user_settings = {}

try {
  user_settings = yaml.load(fs.readFileSync('data/settings.yaml', 'utf8'));
} catch (e) {
  console.log("Creating new settings file.");
  user_settings = default_settings;
  fs.writeFileSync('data/settings.yaml', yaml.dump(settings));
}

//function for getting the settings. If the key is not found, get the value from default_settings
settings.get = function(key, fallback) {
    if (user_settings[key] == undefined) {
      if (fallback != undefined) {
        return fallback;
      } else {
        return default_settings[key];
      }
    } else {
        return user_settings[key];
    }
}

//a function for updating the settings
settings.update = function(key, value) {
    console.log("updating settings: " + key + " to " + value);
    //stringify the value if it's an object
    if (typeof value === 'object') {
        value = JSON.stringify(value);
    }
    user_settings[key] = value;
    console.log(user_settings);
    fs.writeFileSync('data/settings.yaml', yaml.dump(user_settings));
}

//export the settings module
module.exports = settings;

