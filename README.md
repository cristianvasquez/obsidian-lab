# Obsidian lab

Say you have a terrific script to:

- Find similar notes to the current one.
- Translate a text.
- Know what was your mood the last 3 months, just reading your Obsidian vault.
- Whatever wonder you have under the sleeve :D

And you want to see if it's useful in Obsidian, without having to write a plugin.

That is the purpose of this plugin!

## Why this plugin? Why not program all in Javascript?

Unfortunately, the omnipresent web-language, JavaScript, doesn't have a mature suite of data science libraries, particularly Natural Language Processing.
Sometimes, it is quicker to experiment in Python and later, depending on the results, make it work in Javascript.

## How it works?

This repo cointains two things:

1. a Python server that exposes the scripts through a mini web app. ( this could be implemented using javascript, rust or watever )
2. an Obsidian plugin that calls the web app and shows results in Obsidian

## Python server

List of all the available scripts:

> GET: http://127.0.0.1:5000/

```json
{
  "scripts": [
    "http://127.0.0.1:5000/scripts/hello_world",
    "http://127.0.0.1:5000/scripts/random",
    "http://127.0.0.1:5000/scripts/to_upper_case"
  ]
}
```

To add new scripts, just copy them in the './python/scripts' directory.
The directory structure will be reflected in the url.

For example, if you create `./python/scripts/greetings/hello.py`,
it will be exposed in `http://127.0.0.1:5000/scripts/greetings/hello.py`

## Plugin

The plugin now can call the scripts using POST.

> POST: http://127.0.0.1:5000/scripts/some_list

```json
{
  "vaultPath": "/home/cvasquez/obsidian/development",
  "notePath": "snippets-plugin/Test1.md"
}
```

> Response

```json
{
  "contents": [
    {
      "info": { "score": "0.9820077811564822" },
      "path": { "path": "/path/to/the/note 1.md" }
    },
    {
      "info": { "score": "0.9365154046414078" },
      "path": { "path": "/path/to/the/note 2.md" }
    }
  ]
}
```

And an Obsidian panel is updated with the results

![Text](./docs/example.png)

## Config

Configuring the plugin currently is done with a JSON file, where you specify their URL and how is triggered, how is shown etc.

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

### name

The name of the command used in commands and widgets

### url

The address of the command in the python server

### type

What returns the script?

Can be 'text', 'collection' or ['graph' to be implemented]

### invokeOnFocus

The plugin calls the script when opening a notes

- _addHotKey_: A command is added to call the script
- _debug_: verbose or off
- _userInterface_: how the user interacts with the script, currently can be:
  - 'panel-left': Attaches a panel on the left
  - 'panel-right': Attaches a panel on the right
  - 'replace-text': Replaces the selected text with the response
  - 'insert-text': Inserts text in the cursor position

## Installation

### The javascript part

is built like all the other plugins,

1. Clone this repo into

/{vault}/.obsidian/plugins

2. Install the dependencies

```
yarn install
```

3. build the app

```
yarn build
```

This will build the main file; that Obsidian should detect. Activate the plugin from inside Obsidian, in community plugins

### The python part

1. Install the dependencies,

```sh
pip install flask
```

2. Run the python server

```
python ./python/app.py
```

# Developer log

## Mar 28: POC, Get similar notes to the current one.

- [x] Proof of concept
- [x] Run commands directly
- [x] Python example.
- [x] Javascript example.

## Apr 1: Multiple experiments

- [x] Multiple experiments
- [x] Text panel
- [x] Result list panel
- [x] Experiment commands

## Apr 5: HTTP Calls

- [x] HTTP calls
- [x] Python plugin system
- [x] Add text handler
- [x] Readme

## TODO

- [ ] Add graph clustering handler
- [ ] Add lists, to be pasted as text
