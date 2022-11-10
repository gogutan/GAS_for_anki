// Copy and paste this script to the URL field of your bookmark.
javascript: (
  function () {
    var deployedUrl = 'https://example.com';
    var word = window.getSelection().toString();
    var replacedBody = document.body.innerHTML.replace(/<\/h[1-6]>/g, '.').replace(/<.*?>/g, '').replace(/\s{2,}/g, '.');
    var regexp = new RegExp('[^\\.]*' + word + '(.*?\\.)');
    var sentence = replacedBody.match(regexp)[0].trim();
    var title = document.title;
    var url = window.location.href;
    var fetchingUrl = `${deployedUrl}?word=${encodeURIComponent(word)}&sentence=${encodeURIComponent(sentence)}&title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    document.addEventListener("securitypolicyviolation", (e) => {
      window.location = fetchingUrl;
      setTimeout(() => { window.stop(); }, 200);
    });
    fetch(fetchingUrl);
  }
)()
