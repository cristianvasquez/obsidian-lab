From: https://forum.obsidian.md/t/find-similar-notes-python-script/9450/26

Hey all,

So I had a first pass at what the behaviour for such a plugin could be with some user stories.
Let me know what you think.
Obsidian Python Plugin User Stories
MVP
Python script using a single note

As a user
When i’m working on a note
I want to be able to run python scripts that will use that note as input
So that I see and potentially paste the output based on the title, text and metadata of that note
Passing variables to Python script

As a user
I would like the following variables passed to an activated python script while working on a note: filename, filepath, contents of the note, date created, date modified
So that I can easily use these variables in my script
Python script output

As a user
After I run a python script and get an output
I would like the output to be pasted into my active note
So that I can easily see the output or enhance my current active note
Python script management

As a user
I want to be able to add or remove python scripts used in my Obsidian vault
So that I can easily manage which scripts are available to use
Python script activation

As a user
I want to be able to trigger a python script using a keyword shortcut or button while working on an active note
So that I can easily see or paste the output of the python script without having the leave my note
V1
Select Python Version

As a user
I would like to configure which python version installed on my machine my script will use
So that I can easily experiment in the same environment using terminal or VSCode without having to use Obsidian all the time
Custom variables for Python Script

As a user
I would like to be able to pass custom variables to a script when it is run
So that I can change how I want my script to behave e.g. showDetails=False

I think this would be a great place to start.