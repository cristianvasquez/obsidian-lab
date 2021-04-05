import codecs
import os
import re
from functools import partial

import frontmatter
import networkx as nx
from bs4 import BeautifulSoup

THIS_DIR = os.getcwd()


def build_graph(input_dir, directed=True):
    input_dir = os.path.abspath(os.path.join(THIS_DIR, input_dir))
    G = nx.DiGraph() if directed else nx.Graph()

    # Inverted index, used to handle Obsidian's 'shortest path' strategy
    exclude = {'.git', '.obsidian', '.trash'}
    names_relpath = build_inverted_index(input_dir, exclude)
    get_path = partial(label_to_path, names_relpath)

    page_ref = {}

    def get_set_id(value):
        if value not in page_ref:
            page_ref[value] = len(page_ref) + 1
        return page_ref[value]

    # Generating the graph
    for root, dirs, files in os.walk(input_dir, topdown=True):
        dirs[:] = [d for d in dirs if d not in exclude]

        for file_name in files:
            source_file = os.path.join(root, file_name)
            name, _ = os.path.splitext(file_name)
            with codecs.open(source_file, 'r', encoding='utf-8') as f:

                name, extension = os.path.splitext(file_name)

                def add_node(fm):
                    content = fm.content
                    metadata = fm.metadata

                    unique_name = os.path.relpath(source_file, start=input_dir)
                    _id = get_set_id(unique_name)
                    page_ref[_id] = unique_name

                    node = {
                        'id': _id,
                        'title': get_title(metadata, content, source_file),
                        'source_file': source_file,
                        'metadata': metadata,
                        # 'content': content,
                        # 'links': links
                    }

                    # Add nodes
                    G.add_nodes_from([
                        (_id, node),
                    ])

                    # Add edges
                    for label in get_links(content):
                        link = get_path(label)
                        if link is not None:
                            G.add_edge(_id, get_set_id(link))

                if extension == '.md':
                    try:
                        fm = frontmatter.load(f)
                        add_node(fm)
                    except:
                        print("Warning: could not process front-matter of: {}".format(source_file))

    return G, page_ref


def build_inverted_index(input_dir, exclude):
    names_relpath = {}
    for current_dir, dirs, files in os.walk(input_dir, topdown=True):
        dirs[:] = [d for d in dirs if d not in exclude]
        for file in files:
            if file not in names_relpath:
                names_relpath[file] = []
            relative_path = os.path.relpath(current_dir, start=input_dir)
            names_relpath[file].append(relative_path)
    return names_relpath


def label_to_path(inverted_index, label):
    # If the label contains a pipe '|', then it has an alias.
    tokens = label.split(sep='|', maxsplit=1)
    assert (len(tokens) in {1, 2})
    name, label_extension = os.path.splitext(tokens[0])

    file = f'{name}.md' if label_extension == '' else tokens[0]

    # Obsidian's way
    # If the label does not contain a path, it's unique. We lookup the path.
    # Otherwise, we do nothing
    dir, filename = os.path.split(file)
    if filename not in inverted_index:
        # The reference does not exist
        result = None
    elif dir == '':
        # Lookup the path
        paths = inverted_index[file]
        if (len(paths) != 1):
            raise Exception('There are ambiguous paths', label, paths)

        # assert (len(paths) == 1)
        path = '' if paths[0] == '.' else paths[0]
        result = os.path.join(path, filename)
    else:
        # Has already the path
        result = filename
    return result


def get_links(contents):
    WIKILINK_RE = r'\[\[([^\]\]]+)\]\]'
    pattern = re.compile(WIKILINK_RE)
    return pattern.findall(contents)


def get_title(metadata, content, source_file):
    if 'title' in metadata:
        title = metadata['title']
    else:
        bs = BeautifulSoup(content, 'html.parser')
        h1 = bs.find('h1')
        if h1 is not None:
            title = h1.get_text()
        else:
            _, title = os.path.split(source_file)
    return title
