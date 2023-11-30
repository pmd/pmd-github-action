import * as path from 'path'
import * as sarif from '../src/sarif'
import * as annotations from '../src/annotations'
import * as core from '@actions/core'

// Mock the GitHub Actions core library
let errorMock: jest.SpyInstance
let warningMock: jest.SpyInstance
let noticeMock: jest.SpyInstance

let cwdMock: jest.SpyInstance

describe('pmd-github-action-annotations', function () {
  beforeEach(() => {
    jest.clearAllMocks()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    noticeMock = jest.spyOn(core, 'notice').mockImplementation()

    cwdMock = jest.spyOn(process, 'cwd').mockImplementation()
    cwdMock.mockReturnValue('/folder')
  })

  it('can create annotation', () => {
    const report = sarif.loadReport(
      path.join(__dirname, 'data', 'pmd-report.sarif')
    )
    if (!report) {
      throw new Error('no report')
    }

    annotations.processSarifReport(report)

    expect(noticeMock).toHaveBeenCalledTimes(1)
    expect(noticeMock).toHaveBeenCalledWith(
      `Detects when a local variable is declared and/or assigned but not used.
Second line.
  Third line with additional indentation.
      Fourth line with less indentation.

UnusedLocalVariable (Priority: 5, Ruleset: Best Practices)
https://pmd.github.io/pmd-6.40.0/pmd_rules_apex_bestpractices.html#unusedlocalvariable`,
      {
        title: "Variable 'x' defined but not used",
        file: '/home/andreas/PMD/source/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls',
        startLine: 3,
        endLine: 3
      }
    )
    expect(errorMock).not.toHaveBeenCalled()
    expect(warningMock).not.toHaveBeenCalled()
  })

  it('can deal with error, warning and notice', () => {
    const report = sarif.loadReport(
      path.join(__dirname, 'data', 'pmd-report-priorities.sarif')
    )
    if (!report) {
      throw new Error('no report')
    }
    annotations.processSarifReport(report)

    expect(errorMock).toHaveBeenCalledTimes(2)
    expect(errorMock).toHaveBeenNthCalledWith(
      1,
      'Full description for High Prio Rule\n\n0 - high prio rule (Priority: 1, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleHighPrio',
      {
        title: 'High Prio Rule',
        file: '/folder/file1.txt',
        startLine: 4,
        endLine: 5
      }
    )
    expect(errorMock).toHaveBeenNthCalledWith(
      2,
      'Full description for Medium High Prio Rule\n\n1 - medium high prio rule (Priority: 2, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleMediumHighPrio',
      {
        title: 'Medium High Prio Rule',
        file: '/folder/dir/file2.txt',
        startLine: 5
      }
    )
    expect(warningMock).toHaveBeenCalledTimes(2)
    expect(warningMock).toHaveBeenNthCalledWith(
      1,
      'Full description for Medium Prio Rule\n\n2 - medium prio rule (Priority: 3, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleMediumPrio',
      { title: 'Medium Prio Rule', file: '/folder/file3.txt', startLine: 6 }
    )
    expect(warningMock).toHaveBeenNthCalledWith(
      2,
      'Full description for Medium Low Prio Rule\n\n3 - medium low prio rule (Priority: 4, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleMediumLowPrio',
      { title: 'Medium Low Prio Rule', file: '/folder/file4.txt', startLine: 7 }
    )
    expect(noticeMock).toHaveBeenCalledTimes(2)
    expect(noticeMock).toHaveBeenNthCalledWith(
      1,
      'Full description for Low Prio Rule\n\n4 - low prio rule (Priority: 5, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleLowPrio',
      { title: 'Low Prio Rule', file: '/folder/file5.txt', startLine: 8 }
    )
    expect(noticeMock).toHaveBeenNthCalledWith(
      2,
      'Full description for Low Prio Rule\n\n4 - low prio rule (Priority: 5, Ruleset: sample ruleset)\nhttps://pmd.github.io/latest/ruleLowPrio',
      { title: 'Low Prio Rule', file: '/folder/file6.txt', startLine: 9 }
    )
  })

  it('can deal with empty full description (issue #127)', () => {
    const report = sarif.loadReport(
      path.join(__dirname, 'data', 'pmd-report-empty-full-description.sarif')
    )
    if (!report) {
      throw new Error('no report')
    }
    annotations.processSarifReport(report)

    expect(errorMock).toHaveBeenCalledTimes(0)
    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(warningMock).toHaveBeenNthCalledWith(
      1,
      `The first parameter of System.debug, when using the signature with two parameters, is a LoggingLevel enum.

Having the Logging Level specified provides a cleaner log, and improves readability of it.

DebugsShouldUseLoggingLevel (Priority: 3, Ruleset: Best Practices)
https://pmd.github.io/pmd-6.49.0/pmd_rules_apex_bestpractices.html#debugsshoulduselogginglevel`,
      {
        title: 'Calls to System.debug should specify a logging level.',
        file: '/home/andreas/PMD/source/pmd-it/pmd-github-action-issue-127/src/Test.cls',
        startLine: 3,
        endLine: 3
      }
    )
    expect(noticeMock).toHaveBeenCalledTimes(1)
    expect(noticeMock).toHaveBeenNthCalledWith(
      1,
      `

AvoidProductionDebugLogs (Priority: 5, Ruleset: My Default)
`,
      {
        title:
          'Avoid leaving System.debug() statments in code as they negativly influence performance.',
        file: '/home/andreas/PMD/source/pmd-it/pmd-github-action-issue-127/src/Test.cls',
        startLine: 3,
        endLine: 3
      }
    )
  })
})
