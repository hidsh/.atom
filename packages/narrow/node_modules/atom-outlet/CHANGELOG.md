# 0.13.1
- Update dependencies.
- Explicitly activate pane in `focus()`.

# 0.13.0
- Minor fix for `focus`
- Set `outlet-hidden-in-center` attribute on hide BEFORE start hiding so that other object can know why item moved.

# 0.12.0
- add `onDidRelocate` mixin. used in `atom-narrow` pkg

# 0.11.0
- Remove conditional `extendsTextEditor`
- Allow hide center outlet
- Lots of minor tune/improvement
- Add test spec

# 0.10.0
- Introduce `toggleFocus`

# 0.9.0
- Refocus to linked-pane on hide.

# 0.7.0
- Now can hide `outlet` in `center` container by `relocate` to dock before `hide`.

# 0.5.1
- Bug fix where editorOptions not correctly handled.

# 0.5.0
- Separate editorOptions for create options.
