const KEY_PROJECT="KEY_PROJECT"


const JIRA_URL_PREFIX="http://jira.atlassian.com"


const KEY_COMPONENT_LIST="KEY_COMPONENT_LIST"
const COMPONENT_LIST_DEFAULT=[]
let componentList = []


window.onload = function() {
  // Show hardcoded Jira base URL
  document.getElementById("jira_url_prefix").innerText = JIRA_URL_PREFIX

  // Load initial value for project
  chrome.storage.sync.get({KEY_PROJECT}, function(fetchResult){
    const project = (fetchResult.KEY_PROJECT !== KEY_PROJECT) ? fetchResult.KEY_PROJECT : ""
    document.getElementById("project").value = project
  })

  // Load initial value for component list
  chrome.storage.sync.get({KEY_COMPONENT_LIST: COMPONENT_LIST_DEFAULT}, function(fetchResult){
    componentList = fetchResult.KEY_COMPONENT_LIST
    rebuildComponentListArea()
  })

  // Setup "Create component" button
  document.getElementById("button_create_component").addEventListener("click", async () => {
    createNewComponent()
  })

  // Setup "Delete component" button
  document.getElementById("button_delete_component").addEventListener("click", async () => {
    deleteCurrentComponent()
  })

  // Setup save button
  document.getElementById("button_save").addEventListener("click", async () => {
    save()
  })
}


function rebuildComponentListArea() {
  clearComponentListArea()

  for (const component of componentList) {
    addNewComponent(component.name)
  }
}


function clearComponentListArea() {
  const componentListArea = document.getElementById("component_list_area")
  while (componentListArea.firstChild) {
    componentListArea.removeChild(componentListArea.lastChild)
  }
}


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


function changeComponent(name) {
  storeCurrentComponent()

  // Show data from component clicked
  for (const component of componentList) {
    if (component.name === name) {
      document.getElementById("component").innerText = name
      document.getElementById("description").value = component.description
      document.getElementById("description").disabled = false
      document.getElementById("button_delete_component").hidden = false
      console.log(component.description)
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


function compare(a, b) {
  if ( a.name < b.name ){
    return -1
  }
  if ( a.name > b.name ){
    return 1
  }
  return 0
}


function deleteCurrentComponent() {
  const name = document.getElementById("component").value
  if (name) {
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
          document.getElementById("component").value = ""
          document.getElementById("description").value = ""
          document.getElementById("description").disabled = true
          document.getElementById("button_delete_component").hidden = false
        }
        break
      }
    }
  }
}


function save() {
  const project = document.getElementById("project").value.trim()
  if (!project || project.length == 0) {
    alert("Cannot save: Invalid project ID.")
    return
  }
  
  chrome.storage.sync.set({KEY_PROJECT: project})

  storeCurrentComponent()
  chrome.storage.sync.set({KEY_COMPONENT_LIST: componentList})
}