let componentList = []


window.onload = function() {
  // Show hardcoded Jira base URL
  document.getElementById("jira_url_prefix").innerText = JIRA_URL_PREFIX

  // Show hardcoded Project ID
  document.getElementById("project").innerText = PROJECT_ID

  // Load initial value for component list
  chrome.storage.sync.get({KEY_COMPONENT_LIST: []}, function(fetchResult){
    componentList = fetchResult.KEY_COMPONENT_LIST
    rebuildComponentListArea()
  })

  // Setup "Create component" button, auto-save
  document.getElementById("button_create_component").addEventListener("click", async () => {
    createNewComponent()
    save()
  })

  // Setup "Delete component" button, auto-save
  document.getElementById("button_delete_component").addEventListener("click", async () => {
    deleteCurrentComponent()
    save()
  })

  // Auto-save on description change
  document.getElementById("description").addEventListener("input", async () => {
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
 * Clears the component list and recreates it.
 */
function rebuildComponentListArea() {
  clearComponentListArea()

  for (const component of componentList) {
    addNewComponent(component.name)
  }
}


/**
 * Clears the component list.
 */
function clearComponentListArea() {
  const componentListArea = document.getElementById("component_list_area")
  while (componentListArea.firstChild) {
    componentListArea.removeChild(componentListArea.lastChild)
  }
}


/**
 * Adds a new item in the component area.
 * @param {string} name Name of the new component
 */
function addNewComponent(name) {
  const componentListArea = document.getElementById("component_list_area")

  const button = document.createElement("button")
  const span = document.createElement("span")
  span.classList.add("font_base")
  span.innerText = name
  button.appendChild(span)

  button.addEventListener("click", async () => {
    changeComponent(name)
  })

  componentListArea.appendChild(button)
}


/**
 * Shows data of the component selected by the user.
 * @param {string} name Name of the component to display
 */
function changeComponent(name) {
  storeCurrentComponent()

  // Show data from component clicked
  for (const component of componentList) {
    if (component.name === name) {
      document.getElementById("component").innerText = name
      document.getElementById("description").value = component.description
      document.getElementById("description").disabled = false
      document.getElementById("button_delete_component").hidden = false
    }
  }

  // Highlight component button clicked, remove highlight from previous button (if any)
  const componentListArea = document.getElementById("component_list_area")
  for (const componentButton of componentListArea.childNodes) {
    if (componentButton.firstChild.innerText === name) {  // First child == span
      componentButton.classList.add("button_selected")
    } else {
      componentButton.classList.remove("button_selected")
    }
  }
}


/**
 * Saves the state of the currently visible component.
 */
function storeCurrentComponent() {
  const name = document.getElementById("component").innerText
  const description = document.getElementById("description").value

  if (name) {
    for (const component of componentList) {
      if (component.name === name) {
        component.description = description.trim()
        break
      }
    }
  }
}


/**
 * Creates a new component.
 */
function createNewComponent() {
  var newComponentName = null
  while (newComponentName == null) {
    let promptAnswer = prompt("New component name:")
    if (promptAnswer == null || promptAnswer.trim().length == 0) {
      return
    }
    var isDuplicate = false
    for (const component of componentList) {
      if (component.name === promptAnswer) {
        isDuplicate = true
      }
    }
    if (!isDuplicate) {
      newComponentName = promptAnswer
    }
  }

  componentList.push({"name": newComponentName, "description": ""})
  componentList.sort(compare)
  rebuildComponentListArea()
  changeComponent(newComponentName)
}


/**
 * Component comparison, used for sorting the component list.
 * @param {*} a Component A
 * @param {*} b Component B
 * @returns A value indicating which component comes first alphabetically.
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
 * Deletes the currently selected component.
 */
function deleteCurrentComponent() {
  const name = document.getElementById("component").innerText
  if (name) {
    if (!confirm("Component '"+name+"' will be deleted. Continue?")) {
      return
    }
    for (var i=0; i<componentList.length; i++) {
      if (componentList[i].name === name) {
        componentList.splice(i, 1)  // Remove 1 element starting from position i
        rebuildComponentListArea()

        if (componentList.length > i) {
          // After deleting a component, select the one to its right
          changeComponent(componentList[i].name)
        } else if (componentList.length > 0) {
          // If there's no right component (i.e. we deleted the last one), select the new last component
          changeComponent(componentList[componentList.length-1].name)
        } else {
          // Empty list, clear everything
          clearComponentSelection()
        }
        break
      }
    }
  }
}


/**
 * Clears the component selection.
 */
function clearComponentSelection() {
  document.getElementById("component").innerText = ""
  document.getElementById("description").value = ""
  document.getElementById("description").disabled = true
  document.getElementById("button_delete_component").hidden = true
}


/**
 * Saves all component data to Chrome storage.
 */
function save() {
  storeCurrentComponent()
  chrome.storage.sync.set({KEY_COMPONENT_LIST: componentList})
}


/**
 * Exports components data to a JSON file.
 */
function exportData() {
  const dataAsStr = JSON.stringify({KEY_COMPONENT_LIST: componentList}, null, 2)
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
 * Parses the contents of the file selected by the user and, if it's valid, import it, replacing the existing components.
 */
function importData() {
  var file = document.getElementById("import_file_selector").files[0]
  if (file) {
    var reader = new FileReader()
    reader.onload = function(e){
      if (confirm("Current data will be replaced by the contents of this file. Continue?")) {
        const newComponentList = validateImportData(e.target.result)
        if (newComponentList) {
          componentList = newComponentList
          componentList.sort(compare)
          rebuildComponentListArea()
  
          clearComponentSelection()
  
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

  const newComponentList = newData.KEY_COMPONENT_LIST
  if (!newComponentList || !Array.isArray(newComponentList)) {
    return null
  }

  for (const newComponent of newComponentList) {
    if (!newComponent.name || typeof newComponent.name !== 'string' || newComponent.name.trim().length == 0) {
      return null
    }

    if (!newComponent.description) {
      newComponent.description = ""

    } else if (typeof newComponent.description !== 'string') {
      return null
    }
  }
  return newComponentList
}