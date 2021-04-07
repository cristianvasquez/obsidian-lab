# Obsidian lab plugin

Say you have a terrific script to:

- Find similar notes to the current one.
- Translate a text.
- Know what was your mood the last three months, just reading your Obsidian vault.
- Whatever wonder you have under the sleeve :D

And you want to see if it's helpful in Obsidian without having to write a plugin.

That is the purpose of this plugin!. 

It's a plugin that calls a web app that executes the script, and then the results are shown in Obsidian

## Why this plugin? Why not program all in Javascript?

Unfortunately, the universal web language, JavaScript, doesn't have a mature suite of data science libraries, particularly Natural Language Processing.
Sometimes, it is quicker to experiment in, for example, Python, and later, if you want, make it work in Javascript.

## Requirement

Install and run a web server, such as [obsidian-lab-py](https://github.com/cristianvasquez/obsidian-lab-py), that exposes python scripts.

Perhaps someone else wants to do one using javascript, rust, or whatever? :D

## How it works?

1. The plugin makes a call using POST.

> POST: http://127.0.0.1:5000/scripts/some_list

```json
{
  "vaultPath": "/home/cvasquez/obsidian/development",
  "notePath": "snippets-plugin/Test1.md"
}
```
And gets a JSON response

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

2. The plugin the UI with the JSON response.

![Text](./docs/example.png)

## Config

Configuring the plugin currently is done with a JSON file, where you specify what is triggered, how is it shown, etc...

```json
{
  "commands": [
    {
      "name": "Hello world",
      "url": "http://localhost:5000/hello_world",
      "type": "text",
      "invokeOnFocus": false,
      "addHotkey": true,
      "debug": "verbose",
      "userInterface": "insert-text"
    },
    {
      "name": "Convert to upper case",
      "url": "http://localhost:5000/to_upper_case",
      "type": "text",
      "invokeOnFocus": false,
      "addHotkey": true,
      "debug": "verbose",
      "userInterface": "replace-text"
    },
    {
      "name": "Random score similarity",
      "url": "http://localhost:5000/random",
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

The plugin calls the script when opening a note.

- _addHotKey_: A command is added to call the script
- _debug_: verbose or off
- _userInterface_: how the user interacts with the script, currently can be:
  - 'panel-left': Attaches a panel on the left
  - 'panel-right': Attaches a panel on the right
  - 'replace-text': Replaces the selected text with the response (example: translate a paragraph)
  - 'insert-text': Inserts text in the cursor position (example: insert a table of contents)

## Build

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

## Apr 6: Command line

- [X] Parametrized python server

## Apr 7: Split in two

- [X] Splitted into plugin and [server](https://github.com/cristianvasquez/obsidian-lab-py) repos

## TODO

- [ ] Add graph clustering handler
- [ ] Lists can be pasted in the editor as lists
- [ ] Separate into a python command line
