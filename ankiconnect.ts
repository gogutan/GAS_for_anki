function invoke(action, version, params = {}) {
  const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('error', () => reject('failed to issue request'));
    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw 'response has an unexpected number of fields';
        }
        if (!response.hasOwnProperty('error')) {
          throw 'response is missing required error field';
        }
        if (!response.hasOwnProperty('result')) {
          throw 'response is missing required result field';
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open('POST', 'http://127.0.0.1:8765');
    xhr.send(JSON.stringify({action, version, params}));
  });
}

const main = async () => {
  const { action, version, params } = request
  await invoke(action, version, params)
}

const request = {
  "action": "addNotes",
  "version": 6,
  "params": {
    "notes": [
      {
        "deckName": "Words and sentences from websites",
        "modelName": "Words and sentences from websites",
        "fields": {
          "Front": "example",
          "例文": "This is an example sentence.",
          "ノート": "Example Title",
          "リンク": "https://example.com"
        },
      },
    ]
  }
}

main()
