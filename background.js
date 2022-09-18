chrome.runtime.onMessage.addListener(
  function(data, sender, sendResponse) {
    chrome.downloads.download({
      url: data.url,
      filename: data.filename
    })
   }
)