openFiles = (filePaths...) ->
  waitsForPromise ->
    Promise.all(atom.workspace.open(filePath) for filePath in filePaths)

dispatchCommand = (command) ->
  workspaceElement = atom.views.getView(atom.workspace)
  atom.commands.dispatch(workspaceElement, command)

describe "recent-finder", ->
  [main, pathFile1, pathFile2, pathFile3] = []

  getAllItems = ->
    main.history.getAllItems()

  beforeEach ->
    pathFile1 = atom.project.resolvePath('file1')
    pathFile2 = atom.project.resolvePath('file2')
    pathFile3 = atom.project.resolvePath('file3')
    waitsForPromise ->
      atom.packages.activatePackage('recent-finder').then (pack) ->
        main = pack.mainModule
        main.history.clear()

  afterEach ->
    main.history.clear()

  describe "initial state", ->
    it "history is empty", ->
      expect(getAllItems()).toEqual([])

  describe "when file was opened", ->
    it "add filePath to history", ->
      items = [pathFile1, pathFile2, pathFile3]
      openFiles(items...)
      runs -> expect(getAllItems()).toEqual(items.reverse())

  describe "duplicate entries in history", ->
    it "remove older entries", ->
      openFiles(pathFile1, pathFile2)
      runs -> expect(getAllItems()).toEqual([pathFile2, pathFile1])
      openFiles(pathFile1)
      runs -> expect(getAllItems()).toEqual([pathFile1, pathFile2])

  describe "recent-finder.max setting", ->
    beforeEach ->
      atom.config.set('recent-finder.max', 2)

    it "remove older entries", ->
      openFiles(pathFile1, pathFile2)
      runs -> expect(getAllItems()).toEqual([pathFile2, pathFile1])
      openFiles(pathFile3)
      runs -> expect(getAllItems()).toEqual([pathFile3, pathFile2])

  describe "recent-finder:clear command", ->
    it "clear history", ->
      items = [pathFile1, pathFile2, pathFile3]
      openFiles(items...)
      runs ->
        expect(getAllItems()).toEqual(items.reverse())
        dispatchCommand('recent-finder:clear')
        expect(getAllItems()).toEqual([])

  describe "recent-finder:toggle command", ->
    beforeEach ->
      spyOn(main.getView(), 'toggle')

    it "open fuzzy-finder view with items in history", ->
      items = [pathFile1, pathFile2, pathFile3]
      itemsReversed = items.slice().reverse()
      openFiles(items...)
      runs ->
        expect(getAllItems()).toEqual(itemsReversed)
        dispatchCommand('recent-finder:toggle')
        expect(main.getView().toggle).toHaveBeenCalledWith(itemsReversed)
