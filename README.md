# Hermes - **_DEMO_**

Hermes is a real-time messaging application that enables users to communicate seamlessly with each other. These communications take place in group chats, which users can create/leave/join. Hermes provides a reliable, secure and efficient platform for instant messaging, additionaly supporting text-file transfers. At this stage of development, the application provides users with a terminal interface, containing minimal working functionalities as prove of concept.

**Table of contents:**

- [Getting Started](#getting-started)
- [Running the App](#running-the-app)
- [Development](#development)
- [Testing](#testing)
- [List of Commands](#list-of-commands)

<br>

## Getting Started

Before running or testing the app, ensure you have the necessary dependencies installed. Use the following commands:

```shell
npm ci
```

<br>

## Running the App

To start the Chatter app, run the following command:

```shell
npm run client
```

This will launch the client in current terminal and connect to our server. Communication is secured by modern day standards utilizing RSA encripted certificates. User information is stored in accordance to European GDPR rules, requests to purge personal information can be sent to: [hermes.info.questions@gmail.com](mailto:hermes.info.questions@gmail.com?subject=Chatter-PenOCWProject%20Inquiry&body=Hello,%0A%0AI%20have%20the%20following%20questions%3A%0A%0A).

![](https://i.imgur.com/AhA1dqH.png 'Terminal example')

<br>

## Development

For local development and testing or code review, you can run the server in debug mode, on the localhost address. To achieve this and make connection with a localhost client, effectuate the following commands:

```shell
npm run dev-server
npm run dev-client
```

Node Package Manager (npm) warnings regarding the **punycode** module can be ignored. This is due to the fact that the users' local machine runs a newer npm version than what punycode or other modules with punycode as dependency are rated for. Node Package Manager version v21.0.0 or newer is recommended, downgrading to version v20.9.0 resolves punycode warnings.

Commands mentioned above run the client in normal mode and server in debug mode. The task description mentioned that the client should be able to run in debug mode. Note the debug statements render the terminal poorly readable and interactable. Starting the client with debug mode on localhost adress can be achieved by following command:

```shell
npm run dev-client-debug
```

<br>

## Testing

Run all the vitest test cases with extension ".mts" (typescript files) to ensure the reliability of the application, using following command:

```shell
npm run test-mts
```

Building the javascript files, and testing these requires different commands. Run all the vitest test cases with extension ".mjs" using following commands:

```shell
npm run build
npm run test-mjs
```

<br>

## List of Commands

Hermes chatter supports various commands for a seamless messaging experience. Here is a list of available commands:

| Command  | Arguments        | Description                                                     |
| -------- | ---------------- | --------------------------------------------------------------- |
| send     | message          | Sends a message over the WebSocket                              |
| nick     | nickname         | Change current nickname by new entry                            |
| open     | channel          | Opens the specified channel                                     |
| create   | channel          | Creates a new channel and opens it                              |
| sendfile | path             | Sends the textfile at path in the current channel               |
| lookup   | HH:mm yyyy-MM-dd | Returns closest message(s) for given time and date              |
| close    | /                | Closes the currently open channel                               |
| list     | /                | Provides a list of all existing channels                        |
| help     | /                | Displays a list of all possible commands and their descriptions |
| exit     | /                | Closes the application                                          |

##

Feel free to report issues, or suggest improvements. Happy chatting on Hermes, _the messenger of the gods_!
