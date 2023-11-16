const path = require('path')
const validator = require('../lib/validator')

describe('pmd-github-action-validator', function () {
  it('validate input version', () => {
    expect(validator.validateVersion('latest')).toBe('latest')
    expect(validator.validateVersion('6.40.0')).toBe('6.40.0')
  })

  it('validate input version should throw', () => {
    expect(() => validator.validateVersion('; /bin/bash')).toThrow(
      'Invalid version'
    )
  })

  it('validate source path', () => {
    expect(validator.validateSourcePath('.')).toBe('.')
    expect(validator.validateSourcePath('./src')).toBe('src')
    expect(validator.validateSourcePath('src')).toBe('src')
    expect(validator.validateSourcePath('src/main/java')).toBe(
      path.normalize('src/main/java')
    )
  })

  it('validate source path should throw', () => {
    expect(() => validator.validateSourcePath('/src')).toThrow(
      'Invalid sourcePath'
    )
    expect(() => validator.validateSourcePath('; /bin/bash')).toThrow(
      'Invalid sourcePath'
    )
  })

  it('validate rulesets list', () => {
    expect(validator.validateRulesets('ruleset.xml')).toBe('ruleset.xml')
    expect(validator.validateRulesets('rulesets/java/quickstart.xml')).toBe(
      'rulesets/java/quickstart.xml'
    )
    expect(
      validator.validateRulesets('rulesets/java/quickstart.xml,ruleset.xml')
    ).toBe('rulesets/java/quickstart.xml,ruleset.xml')
    expect(
      validator.validateRulesets('rulesets/java/quickstart.xml, ruleset.xml')
    ).toBe('rulesets/java/quickstart.xml,ruleset.xml')
  })

  it('validate rulesets should throw', () => {
    expect(() => validator.validateRulesets('; /bin/bash')).toThrow(
      'Invalid rulesets'
    )
  })

  test('validate download url', () => {
    expect(() => validator.validateDownloadUrl('foo')).toThrow(
      'Invalid downloadUrl'
    )
    expect(validator.validateDownloadUrl('')).toBe('')
    expect(
      validator.validateDownloadUrl(
        'https://sourceforge.net/projects/pmd/files/pmd/7.0.0-SNAPSHOT/pmd-bin-7.0.0-SNAPSHOT.zip/download'
      )
    ).toBe(
      'https://sourceforge.net/projects/pmd/files/pmd/7.0.0-SNAPSHOT/pmd-bin-7.0.0-SNAPSHOT.zip/download'
    )
  })
})
