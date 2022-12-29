# OpenAI-Discord-Bot

This is a Discord bot with commands to utilize GPT-3 text completion.  This implementation allows multiple discord members to have coherent conversations with the bot.  The conversations are unique to the discord channel they take place in.  Additionally there are methods to utilize Dall-E image variations and image creation prompts.

You'll need an api key from OpenAI, and a discord bot token.  Put these in .env as DISCORD_BOT_TOKEN and OPENAI_API_KEY.

## Commands

### !openai (text)

Appends the text following the command to the 'running conversation' between the bot and discord channel members sending commands to the bot.  The OpenAI response is sent to the discord channel.

### !dalle (text description)

Send an image creation prompt to OpenAI.  The resulting image is sent as an 'embed' to the discord channel.

## Image Variations

Any PNG or JPG image sent to a channel will be sent to the OpenAI Dall-E image variation endpoint.  The image is converted to the required aspect ratio and file format (square PNG) before sending.  The resulting image is sent as an 'embed' to the discord channel. 

Future work could adapt this to use emoji reacts on an original image instead of every image sent to the channel. 

 
