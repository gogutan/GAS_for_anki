const doGet = (e: any) => {
  appendUrlAndWord(e.parameter.word, e.parameter.sentence, e.parameter.title, e.parameter.url)
  const html = HtmlService.createTemplateFromFile('index');
  return html.evaluate()
}

const appendUrlAndWord = (word: string, sentence: string, title: string, url: string) => {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  sheet.appendRow([word, sentence, title, url])
  createTSV()
}

const createTSV = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getActiveSheet()
  //二次元配列
  const values = sheet.getDataRange().getValues().map((v: any) => splitByTab(v))
  const tsv = values.join('\n')
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values', sheet.getSheetName() + '.tsv')
  const folder = getParentFolder(ss)
  folder.getFilesByName(`${sheet.getName()}.tsv`).next()?.setTrashed(true);
  folder.createFile(blob)
}

const splitByTab = ((array: []) => {
  return array.join('\t')
})

const getParentFolder = (ss: GoogleAppsScript.Spreadsheet.Spreadsheet) => {
  const ssId = ss.getId()
  const parentFolders = DriveApp.getFileById(ssId).getParents()
  const parentFolder = parentFolders.next()

  return parentFolder
}
