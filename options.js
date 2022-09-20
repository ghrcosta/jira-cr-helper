let descriptionList = []


window.onload = function() {
  // Show hardcoded Jira base URL
  document.getElementById("jira_url_prefix").innerText = JIRA_URL_PREFIX

  // Show hardcoded Project ID
  document.getElementById("project").innerText = PROJECT_ID

  // Load initial value for description list
  chrome.storage.sync.get({KEY_DESCRIPTION_LIST: []}, function(fetchResult){
    descriptionList = fetchResult.KEY_DESCRIPTION_LIST
    rebuildDescriptionListArea()
  })

  // Setup "Create description" button, auto-save
  document.getElementById("button_create_description").addEventListener("click", async () => {
    createNewDescription()
    save()
  })

  // Setup "Delete description" button, auto-save
  document.getElementById("button_delete_description").addEventListener("click", async () => {
    deleteCurrentDescription()
    save()
  })

  // Auto-save on description change
  getCurrentDescriptionTextObj().addEventListener("input", async () => {
    save()
  })

  // Setup "Export" button
  document.getElementById("button_export").addEventListener("click", async () => {
    exportData()
  })

  // Setup "Import" button (clicking the button triggers the input, which parses the data on file selection)
  document.getElementById("button_import").addEventListener("click", async () => {
    document.getElementById("import_file_selector").click()
  })
  document.getElementById("import_file_selector").addEventListener("input", async () => {
    importData()
  })
}


/**
 * Clears the description list and recreates it.
 */
function rebuildDescriptionListArea() {
  clearDescriptionListArea()

  for (const description of descriptionList) {
    addNewDescription(description.name)
  }
}


/**
 * Clears the description list.
 */
function clearDescriptionListArea() {
  const descriptionListArea = document.getElementById("description_list_area")
  while (descriptionListArea.firstChild) {
    descriptionListArea.removeChild(descriptionListArea.lastChild)
  }
}


/**
 * Adds a new item in the description area.
 * @param {string} name Name of the new description
 */
function addNewDescription(name) {
  const descriptionListArea = document.getElementById("description_list_area")

  const button = document.createElement("button")
  const span = document.createElement("span")
  span.classList.add("font_base")
  span.innerText = name
  button.appendChild(span)

  button.addEventListener("click", async () => {
    changeDescription(name)
  })

  descriptionListArea.appendChild(button)
}


/**
 * Shows data of the description selected by the user.
 * @param {string} name Name of the description to display
 */
function changeDescription(name) {
  storeCurrentDescription()

  // Show data from description clicked
  for (const description of descriptionList) {
    if (description.name === name) {
      setCurrentDescriptionName(name)
      setCurrentDescriptionText(description.text)
      getCurrentDescriptionTextObj().disabled = false
      document.getElementById("button_delete_description").hidden = false
    }
  }

  // Highlight description button clicked, remove highlight from previous button (if any)
  const descriptionListArea = document.getElementById("description_list_area")
  for (const descriptionButton of descriptionListArea.childNodes) {
    if (descriptionButton.firstChild.innerText === name) {  // First child == span
      descriptionButton.classList.add("button_selected")
    } else {
      descriptionButton.classList.remove("button_selected")
    }
  }
}


/**
 * Saves the state of the currently visible description.
 */
function storeCurrentDescription() {
  const name = getCurrentDescriptionName()
  const text = getCurrentDescriptionText()

  if (name) {
    for (const description of descriptionList) {
      if (description.name === name) {
        description.text = text.trim()
        break
      }
    }
  }
}


/**
 * Creates a new description.
 */
function createNewDescription() {
  var newDescriptionName = null
  while (newDescriptionName == null) {
    let promptAnswer = prompt("Name to identify the new default description:")
    if (promptAnswer == null || promptAnswer.trim().length == 0) {
      return
    }
    var isDuplicate = false
    for (const description of descriptionList) {
      if (description.name === promptAnswer) {
        isDuplicate = true
      }
    }
    if (!isDuplicate) {
      newDescriptionName = promptAnswer
    }
  }

  descriptionList.push({"name": newDescriptionName, "text": ""})
  descriptionList.sort(compare)
  rebuildDescriptionListArea()
  changeDescription(newDescriptionName)
}


/**
 * Description comparison, used for sorting the description list.
 * @param {*} a Description A
 * @param {*} b Description B
 * @returns A value indicating which description comes first alphabetically.
 */
function compare(a, b) {
  if ( a.name < b.name ){
    return -1
  }
  if ( a.name > b.name ){
    return 1
  }
  return 0
}


/**
 * Deletes the currently selected description.
 */
function deleteCurrentDescription() {
  const name = getCurrentDescriptionName()
  if (name) {
    if (!confirm("Description '"+name+"' will be deleted. Continue?")) {
      return
    }
    for (var i=0; i<descriptionList.length; i++) {
      if (descriptionList[i].name === name) {
        descriptionList.splice(i, 1)  // Remove 1 element starting from position i
        rebuildDescriptionListArea()

        if (descriptionList.length > i) {
          // After deleting a description, select the one to its right
          changeDescription(descriptionList[i].name)
        } else if (descriptionList.length > 0) {
          // If there's no right description (i.e. we deleted the last one), select the new last description
          changeDescription(descriptionList[descriptionList.length-1].name)
        } else {
          // Empty list, clear everything
          clearDescriptionSelection()
        }
        break
      }
    }
  }
}


/**
 * Clears the description selection.
 */
function clearDescriptionSelection() {
  setCurrentDescriptionName("")
  setCurrentDescriptionText("")
  getCurrentDescriptionTextObj().disabled = true
  document.getElementById("button_delete_description").hidden = true
}


/**
 * Saves all description data to Chrome storage.
 */
function save() {
  storeCurrentDescription()
  chrome.storage.sync.set({KEY_DESCRIPTION_LIST: descriptionList})
}


/**
 * Exports descriptions data to a JSON file.
 */
function exportData() {
  const dataAsStr = JSON.stringify({KEY_DESCRIPTION_LIST: descriptionList}, null, 2)
  const dataBytes = new TextEncoder().encode(dataAsStr)
  const blob = new Blob([dataBytes], {type: "application/json;charset=utf-8"})
  const url = URL.createObjectURL(blob)

  const filename = "jira-cr-helper_"+Date.now()+".json"

  // This message will be received by background.js, as downloads are not allowed here (i.e. on content scripts)
  chrome.runtime.sendMessage({
    url: url,
    filename: filename
  })
}


/**
 * Parses the contents of the file selected by the user and, if it's valid, import it, replacing the existing descriptions.
 */
function importData() {
  var file = document.getElementById("import_file_selector").files[0]
  if (file) {
    var reader = new FileReader()
    reader.onload = function(e){
      if (confirm("Current data will be replaced by the contents of this file. Continue?")) {
        const newDescriptionList = validateImportData(e.target.result)
        if (newDescriptionList) {
          descriptionList = newDescriptionList
          descriptionList.sort(compare)
          rebuildDescriptionListArea()
  
          clearDescriptionSelection()
  
          save()
  
        } else {
          alert("Operation cancelled, import file contains invalid data.")
        }
      }
      document.getElementById("import_file_selector").value = ""
    }
    reader.readAsText(file)
  }
}


/**
 * Ensures the file being imported contains valid data.
 * @param {string} data Raw data read from the imported file
 * @returns If the file data is valid, returns a proper object ready to be used. Otherwise, returns null.
 */
function validateImportData(data) {
  let newData = null
  try {
    newData = JSON.parse(data)
  } catch(e) {
    return null
  }

  const newDescriptionList = newData.KEY_DESCRIPTION_LIST
  if (!newDescriptionList || !Array.isArray(newDescriptionList)) {
    return null
  }

  for (const newDescription of newDescriptionList) {
    if (!newDescription.name || typeof newDescription.name !== 'string' || newDescription.name.trim().length == 0) {
      return null
    }

    if (!newDescription.text) {
      newDescription.text = ""

    } else if (typeof newDescription.text !== 'string') {
      return null
    }
  }
  return newDescriptionList
}


function getCurrentDescriptionNameObj() {
  return document.getElementById("description")
}
function getCurrentDescriptionName() {
  return getCurrentDescriptionNameObj().innerText
}
function setCurrentDescriptionName(name) {
  getCurrentDescriptionNameObj().innerText = name
}


function getCurrentDescriptionTextObj() {
  return document.getElementById("description_text")
}
function getCurrentDescriptionText() {
  return getCurrentDescriptionTextObj().value
}
function setCurrentDescriptionText(text) {
  getCurrentDescriptionTextObj().value = text
}