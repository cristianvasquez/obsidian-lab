# Obsidian lab


This plugin allows binding scripts to commands and widgets in Obsidian. 

Say you have a terrific script that:

- Find similar notes to the current one
- Find clusters of notes
- Translate a text
- Whatever wonder you have under the sleeve :D

Then you can use this plugin to see if it's helpful in Obsidian.

Why this plugin? Why not program all in Javascript?

Unfortunately, the browser language, JavaScript, doesn't have a mature suite of data science libraries, particularly Natural Language Processing.
Sometimes, it is quicker to experiment in Python and later, depending on the results, make it work in Javascript.

## How it works?

It has two parts,

1. a Python server that exposes the scripts through a mini web app. 
2. an Obsidian plugin that calls the web app and shows results in Obsidian

## Setup of the python part

Install the dependencies,

```sh
pip install flask
```

Run the python server

```
python ./python/app.py
```

If all goes ok, it will provide an endpoint that lists all the exposed scripts.

> http://127.0.0.1:5000/


```json
{
  "scripts": [
    "http://127.0.0.1:5000/scripts/hello_world",
    "http://127.0.0.1:5000/scripts/random",
    "http://127.0.0.1:5000/scripts/to_upper_case"
  ]
}
```

To add new scripts, copy them in the ./python/scripts directory.

## Build the Obsidian plugin

is built like all the others,

Clone this repo into

/{vault}/.obsidian/plugins

Install the dependencies

```
yarn install
```
build the app

```
yarn build
```

This will build the main file; that Obsidian should detect. Activate the plugin from inside Obsidian, in community plugins

## Config

Right now is done with a JSON file, where you can register the scripts using their URL.

```json
{
  "commands": [
    {
      "name": "Hello world",
      "url": "http://localhost:5000/scripts/hello_world",
      "type": "text",
      "invokeOnFocus": false,
      "addHotkey": true,
      "debug": "verbose",
      "userInterface": "insert-text"
    },
    {
      "name": "Convert to upper case",
      "url": "http://localhost:5000/scripts/to_upper_case",
      "type": "text",
      "invokeOnFocus": false,
      "addHotkey": true,
      "debug": "verbose",
      "userInterface": "replace-text"
    },
    {
      "name": "Random score similarity",
      "url": "http://localhost:5000/scripts/random",
      "type": "collection",
      "invokeOnFocus": true,
      "addHotkey": false,
      "debug": "verbose",
      "userInterface": "panel-right"
    }
  ]
}
```

All of them are required :D 

*name*: The name of the command used in commands and widgets
*url*: The address of the command in the python server
*type*: can be 'text', 'collection' or ['graph' to be implemented]
*invokeOnFocus*: The plugin calls the script when opening a notes
*addHotKey*: A command is added to call the script
*debug*: verbose or off
*userInterface*: how the user interacts with the script, currently can be:
* 'panel-left': Attaches a panel on the left 
* 'panel-right': Attaches a panel on the right
* 'replace-text': Replaces the selected text with the response
* 'insert-text': Inserts text in the cursor position


# Developer log

## Apr 1: Get similar notes to the current one.

- [x] Run command POC.
- [x] Multiple experiments and tabs.
- [x] Show a list of results.
- [x] Show result info on hover.
- [x] Python example.
- [x] Javascript example.

## Apr 5: Something more usable

- [x] HTTP calls
- [X] Python plugin system
- [X] Add text handler

## TODO

- [ ] Add graph clustering handler

