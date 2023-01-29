# use node image
FROM node:latest
#add folder to container
ADD . /app
#set working directory
WORKDIR /app
#install dependencies
RUN npm install
#expose port
EXPOSE 3000
#start app
CMD ["npm", "start"]