const assert = require('assert')
const atomOutlet = require('../lib/index.js')
const {TextEditor, TextBuffer} = require('atom')
const {getLocationForItem, isVisibleItem, isActiveItem} = require('../lib/utils')

const SPECIAL_METHODS = ['open', 'relocate', 'show', 'hide', 'toggle', 'focus', 'toggleFocus', 'link']

describe('atom-outlet library', () => {
  let workspaceElement
  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)
    document.body.appendChild(workspaceElement)
    document.body.focus()
  })

  afterEach(() => {
    atom.workspace.getTextEditors().forEach(editor => editor.destroy())
    workspaceElement.remove()
  })

  describe('create', () => {
    describe('create without any options', () => {
      it('create instance of TextEditor', () => {
        const outlet = atomOutlet.create()
        assert.equal(outlet instanceof TextEditor, true)
        assert.equal(outlet.getTitle(), 'untitled')
        assert.equal(outlet.element.hasAttribute('outlet'), true)
        assert.equal(outlet.element.hasAttribute('outlet-use-adjacent-pane'), true)
        assert.equal(outlet.element.getAttribute('outlet-split'), 'right')
        outlet.insertText('hello')
        assert.equal(outlet.isModified(), false)
        assert.equal(outlet.getDefaultLocation(), 'bottom')
        assert.deepEqual(outlet.getAllowedLocations(), ['center', 'bottom'])

        atom.commands.dispatch(outlet.element, 'core:close')
        assert.equal(outlet.isDestroyed(), true)
      })
    })

    it('pass through editorOptions to editor creation', () => {
      const buffer = new TextBuffer()
      const outlet = atomOutlet.create({
        editorOptions: {
          buffer: buffer,
          lineNumberGutterVisible: false
        }
      })
      assert.equal(outlet.buffer, buffer)
      assert.equal(outlet.isLineNumberGutterVisible(), false)
    })

    it('keep state as attribute for specific options', () => {
      {
        const outlet = atomOutlet.create({
          split: 'right',
          useAdjacentPane: true
        })
        assert.equal(outlet.element.hasAttribute('outlet-use-adjacent-pane'), true)
        assert.equal(outlet.element.getAttribute('outlet-split'), 'right')
      }

      {
        const outlet = atomOutlet.create({
          split: 'down',
          useAdjacentPane: false
        })
        assert.equal(outlet.element.hasAttribute('outlet-use-adjacent-pane'), false)
        assert.equal(outlet.element.getAttribute('outlet-split'), 'down')
      }
    })

    it('can set misc options, functions', () => {
      const outlet = atomOutlet.create({
        title: 'Hello world',
        classList: ['sample-outlet'],
        defaultLocation: 'bottom',
        allowedLocations: ['center', 'bottom', 'left', 'right']
      })

      assert.equal(outlet.getTitle(), 'Hello world')
      assert.equal(outlet.element.classList.contains('sample-outlet'), true)
      assert.equal(outlet.getDefaultLocation(), 'bottom')
      assert.deepEqual(outlet.getAllowedLocations(), ['center', 'bottom', 'left', 'right'])
    })

    describe('[option] trackModified', () => {
      it('[when true] behave normally, track editor modification', () => {
        const outlet = atomOutlet.create({trackModified: true})
        outlet.insertText('hello')
        assert.equal(outlet.isModified(), true)
      })
      it('[when false] ignore editor modification', () => {
        const outlet = atomOutlet.create({trackModified: false})
        outlet.insertText('hello')
        assert.equal(outlet.isModified(), false)
        outlet.insertText('world')
        assert.equal(outlet.isModified(), false)
      })
    })

    describe('mixis special methods', () => {
      it('add special methods on TextEditor', async () => {
        const outlet = atomOutlet.create({extendsTextEditor: true})
        for (const name of SPECIAL_METHODS) {
          assert.equal(outlet.hasOwnProperty(name), true)
          assert.equal(typeof outlet[name] === 'function', true)
        }
      })
    })
  })

  describe('open', () => {
    it('open', async () => {
      const normalEditor = await atom.workspace.open()
      assert.equal(isActiveItem(normalEditor), true)

      const outlet = atomOutlet.create()
      await outlet.open()
      const dock = atom.workspace.getBottomDock()

      // It just show outlet on bottom-dock
      assert.equal(dock.isVisible(), true)
      assert.equal(dock.getActivePaneItem(), outlet)

      // But still keep original active pane
      assert.equal(isActiveItem(outlet), false)
      assert.equal(isActiveItem(normalEditor), true)
    })
  })

  describe('relocate', () => {
    it('relocate', async () => {
      const normalEditor = await atom.workspace.open()
      assert(isActiveItem(normalEditor))

      const outlet = atomOutlet.create()
      await outlet.open()
      const dock = atom.workspace.getBottomDock()

      assert(dock.isVisible())
      assert(dock.getActivePaneItem() === outlet)

      assert(!isActiveItem(outlet))
      assert(isActiveItem(normalEditor))

      outlet.relocate()

      assert(!dock.isVisible())
      assert(!dock.getActivePaneItem())

      assert(!isActiveItem(outlet))
      assert(isActiveItem(normalEditor))

      const [leftPane, rightPane] = atom.workspace.getCenter().getPanes()
      assert(leftPane.getActiveItem() === normalEditor)
      assert(rightPane.getActiveItem() === outlet)

      outlet.relocate()

      assert(dock.isVisible())
      assert(dock.getActivePaneItem() === outlet)
      assert(rightPane.isDestroyed())

      // keep focus
      outlet.focus()
      assert(outlet.element.hasFocus())
      outlet.relocate()
      assert(outlet.element.hasFocus())
      outlet.relocate()
      assert(outlet.element.hasFocus())
    })

    it('call callback subscribed by onDidRelocate', async () => {
      const outlet = atomOutlet.create()
      await outlet.open()
      let callCount = 0
      outlet.onDidRelocate(() => {
        callCount++
      })
      assert(callCount === 0)
      outlet.relocate()
      assert(callCount === 1)
      outlet.relocate()
      assert(callCount === 2)
      outlet.relocate()
      outlet.relocate()
      outlet.relocate()
      assert(callCount === 5)
    })
  })

  describe('show', () => {
    it('show', async () => {
      const editor1 = await atom.workspace.open()
      const editor2 = await atom.workspace.open(null, {split: 'right'})
      const [leftPane, rightPane] = atom.workspace.getCenter().getPanes()
      leftPane.activate()
      assert(leftPane.getActiveItem() === editor1)
      assert(rightPane.getActiveItem() === editor2)
      assert(editor1.element.hasFocus())

      const outlet1 = atomOutlet.create()
      const outlet2 = atomOutlet.create()
      await outlet1.open()
      await outlet2.open()
      assert(getLocationForItem(outlet1) === 'bottom')
      assert(getLocationForItem(outlet2) === 'bottom')

      const dock = atom.workspace.getBottomDock()
      assert(dock.getActivePaneItem() === outlet2)
      outlet1.show()
      assert(dock.getActivePaneItem() === outlet1)
      assert(editor1.element.hasFocus())

      // Show in center workspace activate outlet on pane
      outlet1.relocate()
      assert(rightPane.getActiveItem() === outlet1)
      rightPane.activateItem(editor2)
      assert(rightPane.getActiveItem() === editor2)
      outlet1.show()
      assert(rightPane.getActiveItem() === outlet1)
      assert(editor1.element.hasFocus()) // still keep focused to original element

      dock.hide()
      assert(!dock.isVisible())
      outlet2.show()
      assert(dock.isVisible())
    })
  })

  describe('hide/show', () => {
    it('hide in center', async () => {
      const editor = await atom.workspace.open()
      assert(editor.element.hasFocus())

      const outlet = atomOutlet.create({defaultLocation: 'center'})
      await outlet.open()

      assert(getLocationForItem(outlet) === 'center')
      const [leftPane, rightPane] = atom.workspace.getCenter().getPanes()
      assert(leftPane.getActiveItem() === editor)
      assert(rightPane.getActiveItem() === outlet)

      const dock = atom.workspace.getBottomDock()
      assert(!dock.isVisible())

      // Hide outlet when dock have no item
      const disposable = dock.getActivePane().onDidAddItem(state => {
        disposable.dispose()
        assert(state.moved === true)
        assert(state.item === outlet)
        // Ensure this attribute is set before moving
        assert(outlet.element.hasAttribute('outlet-hidden-in-center'))
      })
      outlet.hide()
      assert(!dock.isVisible())
      assert(dock.getActivePaneItem() === outlet)
      assert(getLocationForItem(outlet) === 'bottom')
      assert(outlet.element.hasAttribute('outlet-hidden-in-center'))

      outlet.show()
      assert(!dock.isVisible())
      assert(!dock.getActivePaneItem())
      {
        assert(getLocationForItem(outlet) === 'center')
        const [leftPane, rightPane] = atom.workspace.getCenter().getPanes()
        assert(leftPane.getActiveItem() === editor)
        assert(rightPane.getActiveItem() === outlet)
        assert(!outlet.element.hasAttribute('outlet-hidden-in-center'))
      }

      // Hide outlet when visible dock have another item
      const outlet2 = atomOutlet.create()
      await outlet2.open()
      assert(getLocationForItem(outlet2) === 'bottom')
      assert(dock.isVisible())
      assert(dock.getActivePaneItem() === outlet2)

      outlet.hide()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(dock.isVisible())
      assert(dock.getActivePaneItem() === outlet2)

      outlet.show()
      assert(dock.isVisible())
      assert(dock.getActivePaneItem() === outlet2)
      {
        assert(getLocationForItem(outlet) === 'center')
        const [leftPane, rightPane] = atom.workspace.getCenter().getPanes()
        assert(leftPane.getActiveItem() === editor)
        assert(rightPane.getActiveItem() === outlet)
        assert(!outlet.element.hasAttribute('outlet-hidden-in-center'))
      }

      // Hide outlet when invisible dock have another item
      dock.hide()
      assert(!dock.isVisible())
      assert(dock.getActivePaneItem() === outlet2)

      outlet.hide()
      assert(!dock.isVisible())
      // HACK: Keeping hidden item as active item of dock is intentional.
      // so that `outlet:toggle` can pick latest hidden one first
      assert(dock.getActivePaneItem() === outlet)
    })
  })

  describe('toggle', () => {
    it('toggle', async () => {
      const editor = await atom.workspace.open()
      assert(editor.element.hasFocus())

      const outlet = atomOutlet.create()
      await outlet.open()

      const dock = atom.workspace.getBottomDock()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(dock.isVisible())

      outlet.toggle()

      assert(!dock.isVisible())

      outlet.toggle()

      assert(dock.isVisible())
    })
  })

  describe('focus', () => {
    it('focus', async () => {
      const editor = await atom.workspace.open()
      assert(editor.element.hasFocus())

      const outlet1 = atomOutlet.create()
      const outlet2 = atomOutlet.create()
      await outlet1.open()
      await outlet2.open()

      const dock = atom.workspace.getBottomDock()
      assert(getLocationForItem(outlet1) === 'bottom')
      assert(getLocationForItem(outlet2) === 'bottom')
      assert(dock.isVisible())

      outlet2.focus()
      assert(outlet2.element.hasFocus())

      outlet2.hide()
      assert(!dock.isVisible())
      assert(dock.getActivePaneItem(), outlet2)

      // regression-guard: focus when outlet1 is not activePaneItem
      outlet1.focus()
      assert(dock.isVisible())
      assert(outlet1.element.hasFocus())
    })
  })

  describe('toggleFocus', () => {
    it('toggleFocus', async () => {
      const editor = await atom.workspace.open()
      assert(editor.element.hasFocus())

      const outlet = atomOutlet.create()
      await outlet.open()

      const dock = atom.workspace.getBottomDock()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(dock.isVisible())

      outlet.toggleFocus()
      assert(!editor.element.hasFocus())
      assert(outlet.element.hasFocus())

      outlet.toggleFocus()
      assert(editor.element.hasFocus())
      assert(!outlet.element.hasFocus())
    })
  })

  describe('link', () => {
    let outlet, editor1, editor2, rightPane, leftPane

    beforeEach(async () => {
      editor1 = await atom.workspace.open()
      editor2 = await atom.workspace.open(null, {split: 'right'})
      const panes = atom.workspace.getCenter().getPanes()
      leftPane = panes[0]
      rightPane = panes[1]
      assert(leftPane.getActiveItem() === editor1)
      assert(rightPane.getActiveItem() === editor2)
      leftPane.activate()
      leftPane.activateItem(editor1)
      outlet = await atomOutlet.create().open()
    })

    it('[link editor1] try to keep linked-editor visible while relocating, and focus-to-linked editor when hidden', async () => {
      outlet.link(editor1)

      // when outlet doesn't have focus
      assert(editor1.element.hasFocus())
      outlet.relocate()
      assert(getLocationForItem(outlet) === 'center')
      assert(rightPane.getActiveItem() === outlet)
      assert(isVisibleItem(editor1))
      assert(!isVisibleItem(editor2))
      assert(editor1.element.hasFocus())

      outlet.relocate()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(editor1.element.hasFocus())

      // when outlet has focus
      outlet.focus()
      assert(outlet.element.hasFocus())
      outlet.relocate()
      assert(getLocationForItem(outlet) === 'center')
      assert(rightPane.getActiveItem() === outlet)
      assert(isVisibleItem(editor1))
      assert(!isVisibleItem(editor2))
      assert(outlet.element.hasFocus())

      outlet.relocate()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(outlet.element.hasFocus())

      outlet.hide()
      assert(editor1.element.hasFocus())
    })

    it('[link editor2] try to keep linked-editor visible while relocating, and focus-to-linked editor when hidden', async () => {
      outlet.link(editor2)

      // when outlet doesn't have focus
      assert(editor1.element.hasFocus())
      outlet.relocate()
      assert(getLocationForItem(outlet) === 'center')
      assert(leftPane.getActiveItem() === outlet)
      assert(!isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(outlet.element.hasFocus())

      leftPane.activate()
      leftPane.activateItem(editor1)

      assert(editor1.element.hasFocus())
      outlet.relocate()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(editor1.element.hasFocus())

      // when outlet has focus
      outlet.focus()
      assert(outlet.element.hasFocus())
      outlet.relocate()
      assert(getLocationForItem(outlet) === 'center')
      assert(leftPane.getActiveItem() === outlet)
      assert(!isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(outlet.element.hasFocus())

      outlet.relocate()
      assert(getLocationForItem(outlet) === 'bottom')
      assert(isVisibleItem(editor1))
      assert(isVisibleItem(editor2))
      assert(outlet.element.hasFocus())

      outlet.hide()
      assert(editor2.element.hasFocus())
    })
  })
})
