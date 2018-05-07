function getAdjacentPane (basePane) {
  const parent = basePane.getParent()
  if (parent && parent.getChildren) {
    const children = parent.getChildren()
    const index = children.indexOf(basePane)

    for (const offset of [+1, -1]) {
      const pane = children[index + offset]
      if (pane && pane.constructor.name === 'Pane') {
        return pane
      }
    }
  }
}

function splitPane (pane, direction) {
  switch (direction) {
    case 'left':
      return pane.splitLeft()
    case 'right':
      return pane.splitRight()
    case 'up':
      return pane.splitUp()
    case 'down':
      return pane.splitDown()
  }
}

function getDockForLocation (location) {
  switch (location) {
    case 'left':
      return atom.workspace.getLeftDock()
    case 'right':
      return atom.workspace.getRightDock()
    case 'bottom':
      return atom.workspace.getBottomDock()
  }
}

function adjustIndexForList (list, index) {
  const length = list.length
  if (length === 0) {
    return -1
  } else {
    index = index % length
    return index >= 0 ? index : length + index
  }
}

function isActiveItem (item) {
  return (
    atom.workspace
      .getActivePaneContainer()
      .getActivePane()
      .getActiveItem() === item
  )
}

function isVisibleItem (item) {
  return atom.workspace.getVisiblePanes().some(pane => pane.getActiveItem() === item)
}

function getLocationForItem (item) {
  return atom.workspace
    .paneForItem(item)
    .getContainer()
    .getLocation()
}

function moveItemToPane (item, destinationPane, toLast = false) {
  const wasActive = isActiveItem(item)
  const currentPane = atom.workspace.paneForItem(item)
  if (toLast) {
    currentPane.moveItemToPane(item, destinationPane, {index: destinationPane.getItems().length})
  } else {
    currentPane.moveItemToPane(item, destinationPane)
  }
  destinationPane.activateItem(item)
  if (wasActive) {
    destinationPane.activate()
  }
}

module.exports = {
  getAdjacentPane,
  splitPane,
  getDockForLocation,
  adjustIndexForList,
  isActiveItem,
  isVisibleItem,
  getLocationForItem,
  moveItemToPane
}
