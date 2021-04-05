# Obsidian lab



Python is cool


A minimal interface that uses python scripts.
the scripts can provide functionality such as:

* Find similar notes to the current one
* Find clusters of notes
* Translate a text
* Wathever you  imagine :D



It consists of two parts:

1. An obsidian plugin, that provides commands and 








A minimal interface to use python scripts.

Functionality that can be provided using python scripts:


It consists of two parts: 

1. The plugin, that provides a pane with the

## Installation

Clone this into

/{vault}/.obsidian/plugins

Install dependencies

```
yarn install
```

build the app

```
yarn build
```

This will build a main file. Activate the plugin. 

----

Run the [server](./examples/server.py)


## Stage 1: Get similar notes to the current one.

* [X] Run command POC.
* [X] Multiple experiments and tabs.
* [X] Show a list of results.
* [X] Show result info on hover.
* [X] Python example.
* [X] Javascript example.

## Stage 2: Something usable

* [X] HTTP calls
* [ ] Python plugin system 
* [ ] Add text handler
* [ ] Add graph clustering handler