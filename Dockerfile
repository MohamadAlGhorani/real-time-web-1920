# Use the official Node.js image as the base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the application files into the working directory
COPY . .

# Expose the port that the application will run on
EXPOSE 8080

# Define the entry point for the container
CMD [ "node", "server.js" ]