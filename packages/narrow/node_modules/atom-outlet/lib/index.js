const {TextEditor} = require('atom')
const {
  getAdjacentPane,
  splitPane,
  getDockForLocation,
  adjustIndexForList,
  moveItemToPane,
  getLocationForItem,
  isActiveItem,
  isVisibleItem
} = require('./utils')

const DEFAULT_OPTIONS = {
  editorOptions: null,
  allowedLocations: ['center', 'bottom'],
  defaultLocation: 'bottom',
  split: 'right',
  title: undefined,
  trackModified: false,
  classList: [],
  useAdjacentPane: true
}

const DEFAULT_EDITOR_OPTIONS = {
  buffer: undefined,
  autoHeight: false
}

function create (options = {}) {
  const {allowedLocations, title, trackModified, classList, defaultLocation, split, useAdjacentPane} = Object.assign(
    {},
    DEFAULT_OPTIONS,
    options
  )

  // [NOTE] outlet is just normal TextEditor with special attributes and methods.
  const outlet = new TextEditor(Object.assign({}, DEFAULT_EDITOR_OPTIONS, options.editorOptions))
  atom.commands.add(outlet.element, {
    'core:close': () => outlet.destroy()
  })

  outlet.getAllowedLocations = () => allowedLocations
  outlet.getDefaultLocation = () => defaultLocation
  if (title) {
    outlet.getTitle = () => title
  }
  if (!trackModified) {
    outlet.buffer.isModified = () => false
  }
  outlet.element.classList.add(...classList)
  outlet.element.setAttribute('outlet', '')
  outlet.element.setAttribute('outlet-split', split)
  if (useAdjacentPane) {
    outlet.element.setAttribute('outlet-use-adjacent-pane', '')
  }

  for (const key in MIXIN) {
    if (key in outlet) {
      throw new Error(`\`extendsTextEditor\` options will overwrite ${key}`)
    }
    outlet[key] = MIXIN[key].bind(null, outlet)
  }
  return outlet
}

const MIXIN = {open, relocate, show, hide, toggle, focus, toggleFocus, link, onDidRelocate}

async function open (outlet) {
  await atom.workspace.open(outlet, {
    activatePane: false,
    pane: getPaneForOutlet(outlet, outlet.getDefaultLocation())
  })
  reveal(outlet)
  return outlet
}

function reveal (outlet) {
  atom.workspace.paneForItem(outlet).activateItem(outlet)
  const location = getLocationForItem(outlet)
  if (location !== 'center') {
    getDockForLocation(location).show()
  }
}

function show (outlet) {
  moveToCenterIfNecessary(outlet)
  reveal(outlet)
}

function getNextLocation (outlet) {
  const allowedLocations = outlet.getAllowedLocations()
  if (allowedLocations.length > 1) {
    const index = allowedLocations.indexOf(getLocationForItem(outlet))
    const newIndex = adjustIndexForList(allowedLocations, index + 1)
    return allowedLocations[newIndex]
  }
}

function relocate (outlet) {
  const location = getNextLocation(outlet)
  if (location) {
    moveItemToPane(outlet, getPaneForOutlet(outlet, location))
    reveal(outlet)
    outlet.emitter.emit('did-relocate')
  }
}

function onDidRelocate (outlet, fn) {
  outlet.emitter.on('did-relocate', fn)
}

function hideInCenter (outlet) {
  const location = getNextLocation(outlet)
  if (location) {
    const dock = getDockForLocation(location)
    const activeItem = dock.getActivePane().getActiveItem()
    const wasVisible = dock.isVisible()

    // Move item to end of dock items.
    // This make move item activeItem of dock
    moveItemToPane(outlet, dock.getActivePane(), true)

    // We bascally want hidden item to be active item of dock so that latest
    // hidden outlet is preferentially picked by outlet-manager pkg's `outlet:toggle()`.
    // But when dock was already visible, keeping original visible item visible should be prioritized.
    if (wasVisible) {
      dock.getActivePane().activateItem(activeItem)
    } else {
      dock.hide()
    }
  }
}

function moveToCenterIfNecessary (outlet) {
  // HACK: hidding in center is not allowed, so we relocated it to dock to hide.
  // Then we relocate it to center on show unless it's already shown.
  if (outlet.element.hasAttribute('outlet-hidden-in-center')) {
    if (!isVisibleItem(outlet)) {
      moveItemToPane(outlet, getPaneForOutlet(outlet, 'center'))
    }
    outlet.element.removeAttribute('outlet-hidden-in-center')
  }
}

function hide (outlet) {
  const wasActive = isActiveItem(outlet)

  // HACK: hidding in center is equal to destroy
  // But we want really hide here.
  // So move to dock then hide!
  let hidden
  if (getLocationForItem(outlet) === 'center') {
    // NOTE: 'outlet-hidden-in-center' must be set before actualy hide so that
    outlet.element.setAttribute('outlet-hidden-in-center', '')
    hideInCenter(outlet)
    hidden = true
  } else {
    outlet.element.removeAttribute('outlet-hidden-in-center')
    hidden = atom.workspace.hide(outlet)
  }

  if (hidden && wasActive) {
    focusLinkedCenterPane(outlet)
  }
  return hidden
}

// Avoid using atom.workspace.toggle, since I don't want to auto-focus to pane on show.
function toggle (outlet) {
  hide(outlet) || show(outlet)
}

function focus (outlet) {
  moveToCenterIfNecessary(outlet) // To relocate hidden-in-center outlet to center
  reveal(outlet)

  // I need pane.activate() here? Why jujust `element.focus` is not enough?
  // Since focus would fail when element is not visible (e.g via custom style sheet to achieve Zen mode.)
  // And failing to focus doesn't fire workspace.onDidChangeActivePane event.
  // This event is observed to demaximize maximized(zen-ed) state of pane in vim-mode-plus.
  // If user want normal `focus` behaivor, then they still can use `outlet.element.focus()`.`
  atom.workspace.paneForItem(outlet).activate()
  outlet.element.focus()
}

function toggleFocus (outlet) {
  if (outlet.element.hasFocus()) {
    focusLinkedCenterPane(outlet)
  } else {
    focus(outlet)
  }
}

// When outlet was created from an editor.
// Call this function to link outlet to that editor.
// Linked editor will not be hidden while outlet relocation.
// Only editor in center container can be linked.
function link (outlet, editor) {
  if (getLocationForItem(editor) === 'center') {
    outlet.element.setAttribute('outlet-linked-editor-id', editor.id)
  } else {
    outlet.element.removeAttribute('outlet-linked-editor-id')
  }
}

function getPaneForOutlet (outlet, location = null) {
  if (location === 'center') {
    return getCenterPaneForOutlet({
      basePane: getLinkedCenterPane(outlet) || atom.workspace.getCenter().getActivePane(),
      useAdjacentPane: outlet.element.hasAttribute('outlet-use-adjacent-pane'),
      split: outlet.element.getAttribute('outlet-split')
    })
  } else {
    return getDockForLocation(location).getActivePane()
  }
}

function getLinkedCenterPane (outlet) {
  let linkedEditorId = outlet.element.getAttribute('outlet-linked-editor-id')
  if (linkedEditorId != null) {
    linkedEditorId = Number(linkedEditorId)
    const editor = atom.workspace.getTextEditors().find(editor => editor.id === linkedEditorId)
    if (editor && getLocationForItem(editor) === 'center') {
      return atom.workspace.paneForItem(editor)
    }
  }
}

function focusLinkedCenterPane (outlet) {
  const pane = getLinkedCenterPane(outlet) || atom.workspace.getCenter().getActivePane()
  if (pane) {
    pane.activate()
  }
}

function getCenterPaneForOutlet ({basePane, useAdjacentPane, split = 'right'}) {
  if (useAdjacentPane) {
    const pane = getAdjacentPane(basePane)
    if (pane) {
      return pane
    }
  }

  const activePane = atom.workspace.getActivePane()
  const pane = splitPane(basePane, split)
  activePane.activate()
  return pane
}

module.exports = {create}
