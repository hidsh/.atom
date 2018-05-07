{BufferedProcess, CompositeDisposable} = require 'atom'

lint = (editor, command, options) ->
  helpers = require('atom-linter')
  regex = '(?<file>.+):(?<line>\\d+)\\s-\\s(?<message>.+)'
  file = editor.getPath()

  new Promise (resolve, reject) ->
    stdout = ''
    args = ['--without-color', '--silent', options, file].filter(Boolean)

    new BufferedProcess
      command: command
      args: args
      stdout: (data) -> stdout += data
      exit: ->
        warnings = helpers.parse(stdout, regex).map (message) ->
          message.type = 'warning'
          message
        resolve warnings

module.exports =
  config:
    executablePath:
      title: 'rails_best_practices Executable Path'
      description: 'The path to `rails_best_practices` executable'
      type: 'string'
      default: 'rails_best_practices'
    extraOptions:
      title: 'Extra Options'
      description: 'Options for `rails_best_practices` command'
      type: 'string'
      default: ''

  activate: (state) ->
    linterName = 'linter-rails-best-practices'

    @subscriptions = new CompositeDisposable

    @subscriptions.add atom.config.observe "#{linterName}.executablePath",
      (executablePath) => @executablePath = executablePath

    @subscriptions.add atom.config.observe "#{linterName}.extraOptions",
      (extraOptions) => @extraOptions = extraOptions

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    provider =
      grammarScopes: [
        'source.ruby',
        'source.ruby.rails',
        'source.ruby.rabl',
        'text.html.ruby',
        'text.html.erb',
        'text.haml',
        'text.slim'
      ]
      scope: 'file'
      lintOnFly: true
      lint: (editor) => lint editor, @executablePath, @extraOptions
