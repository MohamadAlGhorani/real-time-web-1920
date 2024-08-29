# Use the official Node.js image as the base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the application files into the working directory
COPY . .

# expose port
EXPOSE 8080

# Define the entry point for the container
CMD [ "node", "server.js" ]