FROM node:latest
RUN mkdir -p /usr/src/reggeltbot
WORKDIR /usr/src/reggeltbot
COPY package.json /usr/src/reggeltbot
RUN npm install\
        && npm install tsc -g\
        && npm install typescript -g
COPY . /usr/src/reggeltbot
RUN tsc
CMD ["node", "lib/index.js"]