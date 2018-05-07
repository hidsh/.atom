# recent-finder [![Build Status](https://travis-ci.org/t9md/atom-recent-finder.svg?branch=master)](https://travis-ci.org/t9md/atom-recent-finder)

Open recent file with fuzzy-finder.

![gif](https://raw.githubusercontent.com/t9md/t9md/27c7505aab5668880e8d1c11ec3a1864cc0555ba/img/atom-recent-finder.gif)

# Configuration

No default keymap.  
You need to configure keymap in you `keymap.cson`.  

e.g.

```coffeescript
# Since both `cmd-p` and `cmd-t` are mapped to
# `fuzzy-finder:toggle-file-finder` by default.
# I use `cmd-p` for this.
'atom-workspace:not([mini])':
  'cmd-p': 'recent-finder:toggle'
```

# Commands

- `recent-finder:toggle`: Toggle recent-finder
- `recent-finder:clear`: Clear history
